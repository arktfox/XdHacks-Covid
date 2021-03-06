require([
  'esri/Map',
  'esri/views/MapView',
  'esri/Graphic',
  'esri/tasks/RouteTask',
  'esri/tasks/support/RouteParameters',
  'esri/tasks/support/FeatureSet',
  'esri/geometry/Point',
  'esri/geometry/geometryEngine',
  'esri/geometry/SpatialReference',
  'esri/tasks/GeometryService',
  'esri/tasks/support/DistanceParameters',
  'esri/symbols/TextSymbol',
], function (
  Map,
  MapView,
  Graphic,
  RouteTask,
  RouteParameters,
  FeatureSet,
  Point,
  geometryEngine,
  SpatialReference,
  GeometryService,
  DistanceParameters,
  TextSymbol
) {
  class Graph {
    constructor() {
      this.edges = []
      this.nodes = []

      const graph = this

      this.Node = class Node {
        constructor(eta, name = 'Node') {
          this.dist = {}
          this.name = name
          this.eta = eta

          graph.nodes.push(this)
        }

        connect(node, weight) {
          this.dist[node] = weight
        }

        distanceTo(node) {
          return this.dist[node]
        }

        toString() {
          return '' + this.name
        }
      }
    }

    edge(a, b, w) {
      a.connect(b, w)
      b.connect(a, w)
    }

    singleEdge(a, b, w) {
      a.connect(b, w)
    }

    distance(a, b) {
      return a.distanceTo(b) || b.distanceTo(a)
    }
  }

  function solve(graph) {
    function permutaions(xs) {
      let ret = []

      for (let i = 0; i < xs.length; i = i + 1) {
        let rest = permutaions(xs.slice(0, i).concat(xs.slice(i + 1)))

        if (!rest.length) {
          ret.push([xs[i]])
        } else {
          for (let j = 0; j < rest.length; j = j + 1) {
            ret.push([xs[i]].concat(rest[j]))
          }
        }
      }
      return ret
    }

    const perms = permutaions(graph.nodes)

    let lowestPerm
    let lowestSize = Infinity

    for (const permutation of perms) {
      console.log(permutation)

      let acc = 0

      acc += permutation[0].eta

      for (let i = 0; i < permutation.length - 1; i++) {
        acc += graph.distance(permutation[i], permutation[i + 1])
        if (acc < permutation[i + 1].eta) {
          acc = permutation[i + 1].eta
        }
      }

      console.log(acc)

      if (acc < lowestSize) {
        lowestSize = acc
        lowestPerm = permutation
      }
    }

    return lowestPerm
  }

  var map = new Map({
    basemap: 'streets-navigation-vector',
  })

  var view = new MapView({
    container: 'viewDiv',
    map: map,
    center: [-122.980507, 49.24881],
    zoom: 12,
  })

  // To allow access to the route service and prevent the user from signing in, do the Challenge step in the lab to set up a service proxy

  var routeTask = new RouteTask({
    url:
      'https://utility.arcgis.com/usrsvcs/appservices/F3vGsnDfdac4LVmZ/rest/services/World/Route/NAServer/Route_World/solve',
  })

  var geometryService = new GeometryService({
    url:
      'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',
  })

  // const points = [
  //   [-13690949.114792448, 6317441.24563755, 50000, "walmart"],
  //   [-13689878.996396458, 6319810.793514388, 2993, "lol"],
  //   [-13684585.732187716, 6315129.025531927, 39498859, "XDDDDDDDD"],
  // ]

  function addGraphic(name, point) {
    var graphic = new Graphic({
      symbol: {
        type: 'simple-marker',
        color: 'white',
        size: '8px',
      },
      geometry: point,
    })
    view.graphics.add(graphic)

    var textSymbol = new Graphic({
      symbol: {
        type: 'text', // autocasts as new TextSymbol()
        color: 'white',
        haloColor: 'black',
        haloSize: '1px',
        text: name,
        xoffset: 3,
        yoffset: 3,
        font: {
          // autocasts as new Font()
          size: 12,
          family: 'Josefin Slab',
          weight: 'bold',
        },
      },
      geometry: point,
    })

    view.graphics.add(textSymbol)
  }

  function getRoute() {
    // Setup the route parameters
    var routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: view.graphics.toArray(),
      }),
      returnDirections: true,
    })
    // Get the route
    routeTask.solve(routeParams).then(function (data) {
      data.routeResults.forEach(function (result) {
        result.route.symbol = {
          type: 'simple-line',
          color: [5, 150, 255],
          width: 3,
        }
        view.graphics.add(result.route)
      })
    })
  }

  /* var test = geometryEngine.project(-122.980507, 49.248810, new SpatialReference(102100))
  
  alert(test.x + " " + test.y) */

  async function getPlotDistances() {
    var test = new Graph()

    var nodeArr = []

    for (var i = 0; i < points.length; i++) {
      nodeArr.push(new test.Node(points[i][2], '' + i))
    }

    for (var i = 0; i < points.length - 1; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var pt1 = new Point(
          points[i][0],
          points[i][1],
          new SpatialReference({
            wkid: 102100,
          })
        )
        var pt2 = new Point(
          points[j][0],
          points[j][1],
          new SpatialReference({
            wkid: 102100,
          })
        )

        var distParams = new DistanceParameters()
        distParams.distanceUnit = 'kilometers'

        distParams.geometry1 = pt1
        distParams.geometry2 = pt2
        distParams.geodesic = true
        console.log('dist')

        var dist = (await geometryService.distance(distParams)) * 72

        test.edge(nodeArr[i], nodeArr[j], dist)
      }
    }

    var solArr = solve(test)

    for (var i = 0; i < points.length; i++) {
      addGraphic(
        points[solArr[i]][3],
        new Point({
          x: points[solArr[i]][0],
          y: points[solArr[i]][1],
          spatialReference: {
            wkid: 102100,
          },
        })
      )
    }

    getRoute()
  }

  view.on('click', function (event) {
    points.push([event.mapPoint.x, event.mapPoint.y])

    if (points.length == 3) {
      getPlotDistances()
    }
  })

  getPlotDistances()
})

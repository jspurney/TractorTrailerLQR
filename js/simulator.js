const NUMBER_OF_MAPS = 8;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 640;
const NODE_SIZE = 3;
const PATH_NODE_COLOR = 'black';
const TRACK_NODE_COLOR = 'red';
const GOAL_NODE_COLOR = 'blue';

// A flag to keep track of when the simulation is running
let simulationStarted = false;
// Path entries are in the following format: [xTrailer, yTrailer, thetaTrailer]
let path = [];
// Flag that keeps track of when the pathbrush is being used
let pathBrushActivated = false;
let lastPathNodeIndex = 0;
let waypointIndex = 0;
let waypointClosenessThreshold = 8;
let waypointDistanceThreshold = 14;
let startSimButton = document.getElementById('startSimButton');
let clearPathButton = document.getElementById('clearPathButton');
let pathbrushStatus = document.getElementById('pathbrushStatus');
let mapSelect = document.getElementById('mapSelect');
let coordinateIndicator = document.getElementById('coordinateIndicator');
let canvasDynamic = document.getElementById('canvasDynamic');
let canvasBackground = document.getElementById('canvasBackground');
let ctxD = canvasDynamic.getContext('2d');
let ctxB = canvasBackground.getContext('2d');

let tractorTrailerSettings = {
  lengthTractor: 23,
  lengthHitch: 5,
  lengthTrailer: 46,
  velocityTractor: 12,
  thetaTractor: bm.radians(270),
  thetaTrailer: bm.radians(270),
  xTrailer: 20,
  yTrailer: 396,
  steeringAngle: 0,
  steeringAngleIndicatorLength: 10,
  steerConstraints: [-1 * bm.radians(45), bm.radians(45)],
  hitchConstraints: [-1 * bm.radians(60), bm.radians(60)],
  vehicleThickness: 22,
  vehicleColor: 'rgba(21, 88, 116, 0.7)',
  hitchColor: 'OrangeRed'
};

function initializeMapSelect() {
  let optionElement = null;

  for (let i = 0; i < NUMBER_OF_MAPS; ++i) {
    optionElement = document.createElement('option');
    optionElement.innerHTML = i.toString();
    mapSelect.appendChild(optionElement);
  }
}
initializeMapSelect();

function drawPath() {
  for (let i = 0; i < path.length; ++i) {
    ctxB.fillStyle = PATH_NODE_COLOR;
    ctxB.fillRect(path[i][0], path[i][1], NODE_SIZE, NODE_SIZE);
  }
}

startSimButton.addEventListener('click', function() {
  if (simulationStarted) {
    simulator.stop();
    simulationStarted = false;
    this.innerHTML = 'Start Simulation';
  } else {
    simulator.init();
    simulationStarted = true;
    this.innerHTML = 'Stop Simulation';
  }
});

clearPathButton.addEventListener('click', function() {
  let map = new Image();
  map.src = `./maps/map_${mapSelect.value}.png`;
  map.onload = function() {
    ctxB.drawImage(map, 0, 0);
  };
  path = [];
  lastPathNodeIndex = 0;
  waypointIndex = 0;
});

canvasDynamic.addEventListener('mousedown', function() {
  pathBrushActivated = true;
  pathbrushStatus.innerHTML = 'On';
});

canvasDynamic.addEventListener('mouseup', function() {
  pathBrushActivated = false;
  pathbrushStatus.innerHTML = 'Off';
});

canvasDynamic.addEventListener('mousemove', function(evt) {
  var rect = this.getBoundingClientRect();
  let currentX = Math.round(evt.clientX - rect.left);
  let currentY = Math.round(evt.clientY - rect.top);

  coordinateIndicator.innerHTML = `(${currentX}, ${currentY})`;

  if (pathBrushActivated) {
    let dist = 0;

    if (path.length > 0) {
      let x = currentX - path[lastPathNodeIndex][0];
      let y = currentY - path[lastPathNodeIndex][1];
      dist = Math.sqrt(x * x + y * y);

      if (dist > waypointDistanceThreshold) {
        path.push([currentX, currentY, NaN]);
        ctxB.fillStyle = PATH_NODE_COLOR;
        ctxB.fillRect(currentX, currentY, NODE_SIZE, NODE_SIZE);

        let angleClockwise = bm.degrees(
          Math.atan2(
            path[lastPathNodeIndex + 1][1] - path[lastPathNodeIndex][1],
            path[lastPathNodeIndex + 1][0] - path[lastPathNodeIndex][0]
          )
        );

        angleClockwise = bm.radians((360 + Math.round(angleClockwise)) % 360);

        if (path.length === 2) {
          path[lastPathNodeIndex][2] = angleClockwise;
        } else {
          let angleDif = angleClockwise - path[lastPathNodeIndex - 1][2];
          let signedAngleDif =
            bm.mod(angleDif + bm.radians(180), bm.radians(360)) - bm.radians(180);

          path[lastPathNodeIndex][2] = path[lastPathNodeIndex - 1][2] + signedAngleDif;
        }
        lastPathNodeIndex += 1;
      }
    } else {
      path.push([currentX, currentY, NaN]);
      ctxB.fillStyle = PATH_NODE_COLOR;
      ctxB.fillRect(currentX, currentY, NODE_SIZE, NODE_SIZE);
    }
  }
});

let simulator = {
  simulationId: null,
  previousTime: 0,
  objectsLoaded: false,
  vehicle: null,

  init: function() {
    let map = new Image();
    map.src = `./maps/map_${mapSelect.value}.png`;

    map.onload = function() {
      ctxB.drawImage(map, 0, 0);
      simulator.vehicle = new TractorTrailer(...Object.values(tractorTrailerSettings));
      drawPath();
      waypointIndex = 0;
      simulator.objectsLoaded = true;
    };

    simulator.loop();
  },
  updateStep: function(dt) {
    if (isNaN(dt)) {
      dt = 0;
    }

    if (simulator.objectsLoaded) {
      // TODO: control and path tracking law
      simulator.vehicle.updateState(dt, simulator.vehicle.steeringAngle, 0);
    }
  },
  drawStep: function() {
    if (simulator.objectsLoaded) {
      ctxD.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      simulator.vehicle.drawVehicle(ctxD);

      if (path.length > 0) {
        if (lastPathNodeIndex != 0) {
          let goalNode = path[lastPathNodeIndex - 1];
          ctxD.fillStyle = GOAL_NODE_COLOR;
          ctxD.fillRect(goalNode[0], goalNode[1], NODE_SIZE, NODE_SIZE);
        }

        ctxD.fillStyle = TRACK_NODE_COLOR;
        ctxD.fillRect(path[waypointIndex][0], path[waypointIndex][1], NODE_SIZE, NODE_SIZE);
      }
    }
  },
  loop: function(currentTime) {
    let dt = currentTime - simulator.previousTime;

    simulator.updateStep(dt);
    simulator.drawStep();
    simulator.simulationId = requestAnimationFrame(simulator.loop);
    simulator.previousTime = currentTime;
  },
  stop: function() {
    cancelAnimationFrame(simulator.simulationId);
  }
};

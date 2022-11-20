import path, { normalize } from 'path';
import { Direction, TileType } from '../src/types';
import { Coordinate, GameMap, Snake } from '../src/utils';

export const getAllFoodCoordinates = (gameMap: GameMap) => {
  const food: Coordinate[] = [];
  for (let y = 0; y < gameMap.height; y++) {
    for (let x = 0; x < gameMap.width; x++) {
      const dest = new Coordinate(x, y);
      const tileType = gameMap.getTileType(dest);
      if (tileType === TileType.Food) {
        food.push(dest);
      }
    }
  }
  return food;
};

export type PathDistance = {
  nextPosition: Coordinate;
  distance: number;
  destination: Coordinate;
};

const allPathsToDestinations = (gameMap: GameMap, dest_coordinates: Coordinate[]) => {
  const paths: PathAndDistance[] = [];
  dest_coordinates.forEach((coor) => {
    const path = shortestPath(gameMap, gameMap.playerSnake.headCoordinate, coor);

    if (path.path.length > 1) {
      paths.push(path);
    }
  });

  const sortedPaths = paths.sort((a, b) => {
    const a_dist = a.weightedDistance;
    const b_dist = b.weightedDistance;
    if (a_dist > b_dist) return 1;
    else return -1;
  });

  const sortedPathsSafeIndex = paths.sort((a, b) => {
    const a_safeIdx = a.safeIndex;
    const b_safeIdx = b.safeIndex;
    if (a_safeIdx < b_safeIdx) return 1;
    else return -1;
  });

  return sortedPathsSafeIndex;
};

export const pathsToNearestFood = (gameMap: GameMap) => {
  const paths: Coordinate[][] = [];

  const allFood = getAllFoodCoordinates(gameMap);
  const sortedFood = sortCoordinatesByDistance(gameMap.playerSnake.headCoordinate, allFood);

  const allPaths = allPathsToDestinations(gameMap, sortedFood);

  return allPaths;
};

export const reducePathsByLookingInTheFuture = (
  gameMap: GameMap,
  paths: PathAndDistance[],
  depth: number,
): PathAndDistance[] => {
  return paths.filter((path) => {
    const nextPos = path.path[1];
    const playerSnake: Snake = {
      ...gameMap.playerSnake,
      coordinates: [...gameMap.playerSnake.coordinates, nextPos],
      name: gameMap.playerSnake.name,
      direction: gameMap.playerSnake.direction,
      headCoordinate: nextPos,
      canMoveInDirection: gameMap.playerSnake.canMoveInDirection,
      relativeToAbsolute: gameMap.playerSnake.relativeToAbsolute,
      tailCoordinate: gameMap.playerSnake.tailCoordinate,
      length: gameMap.playerSnake.length,
    };

    const copyGameMap: GameMap = {
      ...gameMap,
      playerSnake: playerSnake,
      getTileType: gameMap.getTileType,
      isTileFree: gameMap.isTileFree,
    };

    const foodPaths = pathsToNearestFood(copyGameMap);

    const trapPaths = pathsToTrapEnemy(copyGameMap);
    if (depth > 0) {
      const food = reducePathsByLookingInTheFuture(copyGameMap, foodPaths, depth - 1);
      const trap = reducePathsByLookingInTheFuture(copyGameMap, trapPaths, depth - 1);

      return food.length > 0 && trap.length > 0;
    }

    if (foodPaths.length === 0 && trapPaths.length === 0) return false;
    return true;
  });
};

export const sortCoordinatesByDistance = (headPos: Coordinate, coordinates: Coordinate[]) => {
  return coordinates.sort((a, b) => {
    if (headPos.manhattanDistanceTo(a) > headPos.manhattanDistanceTo(b)) return 1;
    else return -1;
  });
};

type QueueItem = { coordinate: Coordinate; distance: number };

const coordinateToString = (c: Coordinate) => {
  return `(${c.x},${c.y})`;
};

const coordinateIsBetweenObstacles = (gameMap: GameMap, coordinate: Coordinate) => {
  return getFreeNeighborCoordinates(gameMap, coordinate).length == 3;
};

const coordinateIsOneUnitFromSnakeHead = (gameMap: GameMap, coordinate: Coordinate) => {
  let found = false;
  gameMap.snakes.forEach((snake) => {
    if (
      snake.headCoordinate !== undefined &&
      snake.headCoordinate.manhattanDistanceTo(coordinate) <= 1 &&
      snake.id !== gameMap.playerId
    ) {
      found = true;
    }
  });

  return found;
};

const tileIsFree = (gameMap: GameMap, coordinate: Coordinate) => {
  return !coordinate.isOutOfBounds(gameMap.width, gameMap.height) && gameMap.isTileFree(coordinate);
};

const normalizeSafeIndex = (pathLength: number, nFreeNeighborsAlongPath: number) => {
  if (pathLength <= 2) {
    if (nFreeNeighborsAlongPath === 0) {
      return 0;
    }
    if (nFreeNeighborsAlongPath <= 1) {
      return 0.5;
    }
    if (nFreeNeighborsAlongPath <= 2) {
      return 0.9;
    }
    return 1;
  }

  // [X][X][O][|][X][X]
  // [X][X][X][|][O][X]
  // [X][X][X][|][-][X]
  // [X][X][X][O][|][X]
  // [X][X][X][X][|][X]    -> (10-1) / 13 ~ 1.8

  return (pathLength * 4) / nFreeNeighborsAlongPath;
};

export type PathAndDistance = {
  path: Coordinate[];
  weightedDistance: number;
  safeIndex: number;
};

const getFreeNeighborsAlongPath = (gameMap: GameMap, path: Coordinate[]) => {
  let cIndex = 0;
  let currentDirection = path[cIndex].directionTo(path[++cIndex]);
  let currentPosition = path[cIndex];
  let nFreeNeighbors = 0;

  const verticalNeighbors = () => {
    const neighbors: Coordinate[] = [];
    const up = currentPosition.translateByDirection(Direction.Up);
    const down = currentPosition.translateByDirection(Direction.Down);
    if (tileIsFree(gameMap, up)) {
      neighbors.push(up);
    }
    if (tileIsFree(gameMap, down)) {
      neighbors.push(down);
    }
    return neighbors.length;
  };

  const horizontalNeighbors = () => {
    const neighbors: Coordinate[] = [];
    const left = currentPosition.translateByDirection(Direction.Left);
    const right = currentPosition.translateByDirection(Direction.Right);
    if (tileIsFree(gameMap, left)) {
      neighbors.push(left);
    }
    if (tileIsFree(gameMap, right)) {
      neighbors.push(right);
    }
    return neighbors.length;
  };

  while (cIndex < path.length) {
    if (currentDirection === Direction.Left || currentDirection === Direction.Right) {
      nFreeNeighbors += verticalNeighbors();
    } else {
      nFreeNeighbors += horizontalNeighbors();
    }
    ++cIndex;
    if (cIndex >= path.length) {
      break;
    }
    currentDirection = currentPosition.directionTo(path[cIndex]);
    currentPosition = path[cIndex];
  }

  return nFreeNeighbors;
};

export const shortestPath = function (gameMap: GameMap, start: Coordinate, finish: Coordinate) {
  const queue: QueueItem[] = [{ coordinate: start, distance: 1 }];
  const dest = finish;
  const visited = new Map();
  let path_dist = 0;
  visited.set(coordinateToString(start), null); // Mark source as visited

  const getNextSteps = (c: Coordinate) => {
    const dirs = [Direction.Down, Direction.Up, Direction.Left, Direction.Right];
    const nextSteps: Coordinate[] = [];
    for (const dir of dirs) {
      if (
        c.x === start.x &&
        c.y === start.y &&
        coordinateIsOneUnitFromSnakeHead(gameMap, c.translateByDirection(dir))
      ) {
        continue;
      }
      if (tileIsFree(gameMap, c.translateByDirection(dir))) {
        nextSteps.push(c.translateByDirection(dir));
      }
    }
    return nextSteps;
  };

  // eslint-disable-next-line prefer-const
  for (let q of queue) {
    // Move the visited check to the loop

    if (q.coordinate.x === dest.x && q.coordinate.y === dest.y) {
      // Derive the path from the linked list we now have in the visited structure:
      const path = [];

      while (q.coordinate !== null) {
        path.push(q.coordinate);
        path_dist = q.distance;

        q.coordinate = visited.get(coordinateToString(q.coordinate));
      }
      const reverseedPath = path.reverse();

      const nFreeNeighborsAlongPath = getFreeNeighborsAlongPath(gameMap, path);

      const safeIndexNormalized = normalizeSafeIndex(
        reverseedPath.length - 1,
        nFreeNeighborsAlongPath - getFreeNeighborCoordinates(gameMap, reverseedPath[0]).length,
      );

      return {
        path: reverseedPath,
        weightedDistance: path_dist,
        safeIndex: safeIndexNormalized,
      } as PathAndDistance; // Need to reverse to get from source to destination
    }

    for (const adj of getNextSteps(q.coordinate)) {
      // Visited-check moved here:
      if (visited.has(coordinateToString(adj))) continue;
      // Mark with the coordinates of the previous node on the path:
      visited.set(coordinateToString(adj), q.coordinate);
      const nFreeNeighbors = getFreeNeighborCoordinates(gameMap, adj).length;

      queue.push({
        coordinate: adj,

        distance: q.distance + 1,
      });
    }
  }

  return { path: [], weightedDistance: -1, safeIndex: 0 } as PathAndDistance; // must modify this as well
};

const getFreeNeighborCoordinates = (gameMap: GameMap, coor: Coordinate) => {
  const up = coor.translateByDirection(Direction.Up);
  const down = coor.translateByDirection(Direction.Down);
  const left = coor.translateByDirection(Direction.Left);
  const right = coor.translateByDirection(Direction.Right);

  return [up, down, left, right].filter((c) => {
    return tileIsFree(gameMap, c);
  });
};

const closestSnakeHeadCoordinates = (gameMap: GameMap) => {
  const headCoors: Coordinate[] = [];
  gameMap.snakes.forEach((snake) => {
    if (snake.headCoordinate !== undefined && snake.id !== gameMap.playerId) {
      getFreeNeighborCoordinates(gameMap, snake.headCoordinate).forEach((coor) => {
        headCoors.push(coor);
      });
    }
  });

  const sorted = headCoors.sort((a, b) => {
    if (
      gameMap.playerSnake.headCoordinate.manhattanDistanceTo(a) >=
      gameMap.playerSnake.headCoordinate.manhattanDistanceTo(b)
    )
      return -1;
    else return 1;
  });

  return sorted;
};

export const pathsToTrapEnemy = (gameMap: GameMap) => {
  const headCoordinatesAllSnakes = closestSnakeHeadCoordinates(gameMap);

  const allPaths = allPathsToDestinations(gameMap, headCoordinatesAllSnakes);
  return allPaths;
};

//returns a number based on how far you can go each direction until you hit wall or obstacle
const meassureCoordinateMoveRoom = (gameMap: GameMap, coordinate: Coordinate) => {
  let total = 0;

  [Direction.Down, Direction.Left, Direction.Right, Direction.Up].forEach((dir) => {
    let end = false;
    let tempCoordinate = coordinate;
    while (!end) {
      tempCoordinate = tempCoordinate.translateByDirection(dir);
      if (!tempCoordinate.isOutOfBounds(gameMap.width, gameMap.height) && gameMap.isTileFree(tempCoordinate)) {
        total += 1;
      } else {
        end = true;
      }
    }
  });
  return total;
};

// const coordinatesWithAtMostOneWall = (gameMap: GameMap) =>{

// }

// export const directionToHugTheWall = (gameMap: GameMap) =>{
//   const coordinates = coordinatesWithAtMostOneWall(gameMap);
// }

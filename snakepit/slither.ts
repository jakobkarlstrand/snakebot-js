import { snakeConsole as console } from '../src/client';
import { Coordinate, GameMap } from '../src/utils';
import { MessageType } from '../src/messages';
import { GameSettings, Direction, RelativeDirection, TileType } from '../src/types';
import type { GameStartingEventMessage, Message, SnakeDeadEventMessage } from '../src/types_messages';
import { pathsToNearestFood, pathsToTrapEnemy, reducePathsByLookingInTheFuture } from './functions';
import { privateEncrypt } from 'crypto';

const allDirections = Object.values(Direction); // [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

const MAX_DISTANCE_TO_GO_FOR_FOOD = 20;

// Get random item in array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * This is where you write your AI code. You will be given a GameMap object containing the current state of the game.
 * Use this object to determine your next move. Remember to return a Direction enum value before your time runs out!
 * (Default time is 250ms)
 */
export async function getNextMove(gameMap: GameMap): Promise<Direction> {
  const myHeadPosition = gameMap.playerSnake.headCoordinate; // Coordinate of my snake's head
  const possibleMoves = allDirections.filter((direction) => gameMap.playerSnake.canMoveInDirection(direction)); //Filters safe directions to move in

  // If there are no safe moves, bad luck!
  if (possibleMoves.length === 0) {
    return Direction.Down;
  }

  // Get all food coordinates which is accesable
  const foodPaths = pathsToNearestFood(gameMap);

  if (foodPaths.length > 0 && foodPaths[0].weightedDistance < MAX_DISTANCE_TO_GO_FOR_FOOD) {
    return gameMap.playerSnake.headCoordinate.directionTo(foodPaths[0].path[1]);
  }

  const trapPaths = pathsToTrapEnemy(gameMap);

  if (trapPaths.length > 0) {
    return gameMap.playerSnake.headCoordinate.directionTo(trapPaths[0].path[1]);
  }

  // const toWall = directionToHugTheWall(gameMap);

  return getRandomItem(possibleMoves);
}

/**
 * This is an optional handler that you can use if you want to listen for specific events.
 * Check out the MessageType enum for a list of events that can be listened to.
 */
export function onMessage(message: Message) {
  switch (message.type) {
    case MessageType.GameStarting:
      message = message as GameStartingEventMessage; // Cast to correct type
      // Reset snake state here
      break;
    case MessageType.SnakeDead:
      message = message as SnakeDeadEventMessage; // Cast to correct type
      // Check how many snakes are left and switch strategy
      break;
  }
}

// Settings ommitted are set to default values from the server, change this if you want to override them
export const trainingGameSettings = {
  // maxNoofPlayers: 2,
  // obstaclesEnabled: false,
  // ...
} as GameSettings;

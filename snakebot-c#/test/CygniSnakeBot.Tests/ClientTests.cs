﻿using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CygniSnakeBot.Client;
using CygniSnakeBot.Client.Communication;
using CygniSnakeBot.tests.Helpers;
using CygniSnakeBot.Client.Events;
using Moq;
using Xunit;
using CygniSnakeBot.Client.Communication.Serialization;

namespace CygniSnakeBot.tests
{
    public class ClientTests
    {
        private Mock<IClientWebSocket> _socketMock;

        [Fact]
        public void ClientShouldInvokeOnGameTurnEventWhenMessageIsReceived()
        {
            _socketMock = new Mock<IClientWebSocket>();
            const string jsonString = "{\"gameTick\":0,\"gameId\":\"1a3d727e-40cb-4982-ba75-9cd67c0cf896\",\"map\":{\"width\":50,\"height\":25,\"worldTick\":0,\"tiles\":[],\"receivingPlayerId\":0,\"type\":\"se.cygni.snake.api.model.Map\"},\"receivingPlayerId\":\"fb5cbf29-fd3c-4012-af0b-bd32ad10c9f7\",\"type\":\"se.cygni.snake.api.event.MapUpdateEvent\"}";
            MapUpdateEventArgs eventArgs = null;

            _socketMock.Setup(m => m.ConnectAsync(It.IsAny<Uri>(), It.IsAny<CancellationToken>())).Returns(Task.Delay(1));
            _socketMock.Setup(m => m.State).Returns(WebSocketState.Open);

            _socketMock.Setup(m => m.ReceiveAsync(It.IsAny<ArraySegment<byte>>(), It.IsAny<CancellationToken>()))
                .Returns<ArraySegment<byte>, CancellationToken>((buffer, cancellationToken) =>
                {
                    var bytes = Encoding.UTF8.GetBytes(jsonString);

                    for (var i = 0; i < bytes.Length; i++)
                        buffer.Array[i] = bytes[i];

                    return
                        Task.FromResult(new WebSocketReceiveResult(bytes.Length,
                            WebSocketMessageType.Text, true));
                });

            var client = new SnakeClient("localhost", 1, "training", null, _socketMock.Object, new JsonConverter());
            client.OnMapUpdate += (sender, args) => { eventArgs = args; };

            client.Connect();

            Retry.For(() => eventArgs != null, TimeSpan.FromSeconds(5));
            Assert.Equal(eventArgs.GameTick, 0);
            Assert.Equal(eventArgs.GameId, "1a3d727e-40cb-4982-ba75-9cd67c0cf896");

            client.Dispose();
        }

        [Fact]
        public void ClientShouldInvokePlayerRegisteredWhenMessageIsReceived()
        {
            _socketMock = new Mock<IClientWebSocket>();
            const string jsonString = "{\"gameId\":\"1a3d727e-40cb-4982-ba75-9cd67c0cf896\",\"name\":\"#emil\",\"color\":\"black\",\"gameSettings\":{\"width\":50,\"height\":25,\"maxNoofPlayers\":5,\"startSnakeLength\":1,\"timeInMsPerTick\":250,\"obstaclesEnabled\":false,\"foodEnabled\":true,\"edgeWrapsAround\":false,\"headToTailConsumes\":false,\"tailConsumeGrows\":false,\"addFoodLikelihood\":15,\"removeFoodLikelihood\":5,\"addObstacleLikelihood\":15,\"removeObstacleLikelihood\":15},\"gameMode\":\"training\",\"receivingPlayerId\":\"fb5cbf29-fd3c-4012-af0b-bd32ad10c9f7\",\"type\":\"se.cygni.snake.api.response.PlayerRegistered\"}";
            PlayerRegisteredEventArgs eventArgs = null; 

            _socketMock.Setup(m => m.ConnectAsync(It.IsAny<Uri>(), It.IsAny<CancellationToken>())).Returns(Task.Delay(1));
            _socketMock.Setup(m => m.State).Returns(WebSocketState.Open);

            _socketMock.Setup(m => m.ReceiveAsync(It.IsAny<ArraySegment<byte>>(), It.IsAny<CancellationToken>()))
                .Returns<ArraySegment<byte>, CancellationToken>((buffer, cancellationToken) =>
                {
                    var bytes = Encoding.UTF8.GetBytes(jsonString);

                    for (var i = 0; i < bytes.Length; i++)
                        buffer.Array[i] = bytes[i];

                    return
                        Task.FromResult(new WebSocketReceiveResult(bytes.Length,
                            WebSocketMessageType.Text, true));
                });

            var client = new SnakeClient("localhost", 1, "training", null, _socketMock.Object, new JsonConverter());
            client.OnPlayerRegistered += (sender, args) => { eventArgs = args; };

            client.Connect();

            Retry.For(() => eventArgs != null, TimeSpan.FromSeconds(5));
            
            Assert.Equal(eventArgs.Name, "#emil");
            Assert.Equal(eventArgs.GameMode, "training");
            Assert.Equal(eventArgs.GameId, "1a3d727e-40cb-4982-ba75-9cd67c0cf896");
            Assert.Equal(eventArgs.Color, "black");

            client.Dispose();
        }

        [Fact]
        public void ClientShouldInvokeGameStartingEvent()
        {
            _socketMock = new Mock<IClientWebSocket>();
            const string jsonString = "{\"gameId\":\"1a3d727e-40cb-4982-ba75-9cd67c0cf896\",\"noofPlayers\":5,\"width\":50,\"height\":25,\"receivingPlayerId\":\"fb5cbf29 - fd3c - 4012 - af0b - bd32ad10c9f7\",\"type\":\"se.cygni.snake.api.event.GameStartingEvent\"}";
            GameStartingEventArgs eventArgs = null;

            _socketMock.Setup(m => m.ConnectAsync(It.IsAny<Uri>(), It.IsAny<CancellationToken>())).Returns(Task.Delay(1));
            _socketMock.Setup(m => m.State).Returns(WebSocketState.Open);

            _socketMock.Setup(m => m.ReceiveAsync(It.IsAny<ArraySegment<byte>>(), It.IsAny<CancellationToken>()))
                .Returns<ArraySegment<byte>, CancellationToken>((buffer, cancellationToken) =>
                {
                    var bytes = Encoding.UTF8.GetBytes(jsonString);

                    for (var i = 0; i < bytes.Length; i++)
                        buffer.Array[i] = bytes[i];

                    return
                        Task.FromResult(new WebSocketReceiveResult(bytes.Length,
                            WebSocketMessageType.Text, true));
                });

            var client = new SnakeClient("localhost", 1, "training", null, _socketMock.Object, new JsonConverter());
            client.OnGameStarting += (sender, args) => { eventArgs = args; };

            client.Connect();

            Retry.For(() => eventArgs != null, TimeSpan.FromSeconds(5));
            Assert.Equal(eventArgs.GameId, "1a3d727e-40cb-4982-ba75-9cd67c0cf896");
            Assert.Equal(eventArgs.NoofPlayers, 5);

            client.Dispose();
        }

        [Fact]
        public void ClientShouldInvokeGameEndedEvent()
        {
            _socketMock = new Mock<IClientWebSocket>();
            const string jsonString = "{\"playerWinnerId\":\"bestWinner\",\"gameId\":\"1a3d727e-40cb-4982-ba75-9cd67c0cf896\",\"gameTick\":1,\"map\":{\"width\":50,\"height\":25,\"worldTick\":1,\"tiles\":[],\"receivingPlayerId\":null,\"type\":\"se.cygni.snake.api.model.Map\"},\"receivingPlayerId\":\"fb5cbf29 - fd3c - 4012 - af0b - bd32ad10c9f7\",\"type\":\"se.cygni.snake.api.event.GameEndedEvent\"}";
            GameEndedEventArgs eventArgs = null;

            _socketMock.Setup(m => m.ConnectAsync(It.IsAny<Uri>(), It.IsAny<CancellationToken>())).Returns(Task.Delay(1));
            _socketMock.Setup(m => m.State).Returns(WebSocketState.Open);

            _socketMock.Setup(m => m.ReceiveAsync(It.IsAny<ArraySegment<byte>>(), It.IsAny<CancellationToken>()))
                .Returns<ArraySegment<byte>, CancellationToken>((buffer, cancellationToken) =>
                {
                    var bytes = Encoding.UTF8.GetBytes(jsonString);

                    for (var i = 0; i < bytes.Length; i++)
                        buffer.Array[i] = bytes[i];

                    return
                        Task.FromResult(new WebSocketReceiveResult(bytes.Length,
                            WebSocketMessageType.Text, true));
                });

            var client = new SnakeClient("localhost", 1, "training", null, _socketMock.Object, new JsonConverter());
            client.OnGameEnded += (sender, args) => { eventArgs = args; };

            client.Connect();

            Retry.For(() => eventArgs != null, TimeSpan.FromSeconds(1));
            Assert.Equal(eventArgs.GameId, "1a3d727e-40cb-4982-ba75-9cd67c0cf896");
            Assert.Equal(eventArgs.PlayerWinnerId, "bestWinner");

            client.Dispose();
        }

        [Fact]
        public void ClientShouldInvokeOnSnakeDeadEvent()
        {
            _socketMock = new Mock<IClientWebSocket>();
            const string jsonString = "{\"deathReason\":\"CollisionWithWall\",\"playerId\":\"fb5cbf29-fd3c-4012-af0b-bd32ad10c9f7\",\"x\":14,\"y\":24,\"gameId\":\"1a3d727e-40cb-4982-ba75-9cd67c0cf896\",\"gameTick\":1,\"receivingPlayerId\":\"fb5cbf29-fd3c-4012-af0b-bd32ad10c9f7\",\"type\":\"se.cygni.snake.api.event.SnakeDeadEvent\"}";
            SnakeDeadEventArgs eventArgs = null;

            _socketMock.Setup(m => m.ConnectAsync(It.IsAny<Uri>(), It.IsAny<CancellationToken>())).Returns(Task.Delay(1));
            _socketMock.Setup(m => m.State).Returns(WebSocketState.Open);

            _socketMock.Setup(m => m.ReceiveAsync(It.IsAny<ArraySegment<byte>>(), It.IsAny<CancellationToken>()))
                .Returns<ArraySegment<byte>, CancellationToken>((buffer, cancellationToken) =>
                {
                    var bytes = Encoding.UTF8.GetBytes(jsonString);

                    for (var i = 0; i < bytes.Length; i++)
                        buffer.Array[i] = bytes[i];

                    return
                        Task.FromResult(new WebSocketReceiveResult(bytes.Length,
                            WebSocketMessageType.Text, true));
                });

            var client = new SnakeClient("localhost", 1, "training", null, _socketMock.Object, new JsonConverter());
            client.OnSnakeDead += (sender, args) => { eventArgs = args; };

            client.Connect();

            Retry.For(() => eventArgs != null, TimeSpan.FromSeconds(5));
            Assert.Equal(eventArgs.GameId, "1a3d727e-40cb-4982-ba75-9cd67c0cf896");
            Assert.Equal(eventArgs.DeathReason, DeathReason.CollisionWithWall);
            Assert.Equal(eventArgs.ReceivingPlayerId, "fb5cbf29-fd3c-4012-af0b-bd32ad10c9f7");

            client.Dispose();
        }
    }
}
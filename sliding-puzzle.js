/*jshint esversion: 6 */
const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['USER', 'REACTION'] });
const config = require('./config');
const MersenneTwister = require("mersenne-twister");
const log = require('simple-node-logger').createSimpleLogger('discordbot.log');

const ownerID = "";
const generator = new MersenneTwister();
const gamesArray = [];

const puzzleArray = [":one:", ":two:", ":three:", ":four:", ":five:", ":six:", ":seven:", ":eight:", ":nine:", ":zero:", ":regional_indicator_a:", ":regional_indicator_b:", ":regional_indicator_c:", ":regional_indicator_d:", ":regional_indicator_e:"];
const finalPiece = [":regional_indicator_f:"];

login();

function login() {
	client.destroy();
	client.login(config.secret2)
		.then(function() {
			log.info("Connected as: " + client.user.username);
		}).catch(function(err) {
			setTimeout(function() {
				client.destroy();
				login();
			}, 15 * 1000);
		});

}

process.on('uncaughtException', function(err) {
	if (err.code === "ENOTFOUND" || err.code === "ENOENT" || err.code === "ETIMEDOUT") {
		setTimeout(function() {
			login();
		}, 15 * 1000);
	} else {
		var guild = client.guilds.cache.find(guild => guild.name === "The Banana Hammock");
		guild.member(ownerID).send("> I broke-eded :sob:")
			.then(function() {
				log.fatal("Caught error: " + err.stack);
				process.nextTick(function() {
					process.exit();
				});
			}).catch(function() {
				log.fatal("Caught error: " + err.stack);
				process.nextTick(function() {
					process.exit();
				});
			});
	}
});

client.on("ready", () => {

});

client.on("reconnecting", () => {
	log.info("Reconnected as: " + client.user.username);
});

client.on("resume", () => {
	log.info("Resumed connection as: " + client.user.username);
});

client.on("disconnect", () => {
	log.info("discord.js disconnected");
});


client.on("message", message => {

	if (!(/^(>)/).test(message.content) || message.channel.type === "dm" || message.member === null || message.member.id === null) {
		return;
	}
	if (message.author.id === client.user.id) { // Bot can't trigger off of itself
		return;
	}

	var args = message.content.substring(1).split(" ");

	switch (args[0].toLowerCase()) {
		case "puzzle":
		{
			let userID = message.author.id;
			if (gamesArray.findIndex(g => g.userID === message.author.id) !== -1) {
				return;
			}
			if (gamesArray.length >= 5) {
				return;
			}
			message.channel.send("Generating puzzle...").then(async (msg) => {
				let game = {
					'msgID': msg.id,
					'userID': userID,
					'gameID': "sliding-puzzle"
				};
				let promiseArray = ["⬅", "➡", "⬆", "⬇", "❌"].map(emoji => msg.react(emoji));
				Promise.all(promiseArray).then(r => {
					function randomizeArray() {
						let array = [];
						for (let i = 0; i < 15; i++) {
							let index = Math.floor(generator.random() * 15);
							while (array.findIndex(e => e === index) !== -1) {
								index = Math.floor(generator.random() * 15);
							}
							array.push(index);
						}
						return array;
					}
					let randomArray = randomizeArray();
					while (!isSolvable(randomArray)) {
						randomArray = randomizeArray();
					}
					randomArray.push("⭕");
					randomArray = randomArray.map(e => {
						if (!isNaN(e)) {
							return puzzleArray[e];
						}
						return e;
					})
					game.positionArray = randomArray;
					game.timeoutID = setTimeout(async function() {
						await removeAllReactions(msg);
						let index = gamesArray.findIndex(g => g.msgID === msg.id);
						gamesArray.splice(index, 1);
					}, 30 * 60 * 1000);
					gamesArray.push(game);
					msg.edit(getDisplayText(game.positionArray));
				});
			});
			break;
		}
		default:
	}
});

client.on("messageReactionAdd", async (reaction, user) => {
	let index = gamesArray.findIndex(g => g.msgID === reaction.message.id);
	if (index === -1) {
		return;
	}
	if (user.id !== gamesArray[index].userID) {
		removeReactions(reaction);
		return;
	}
	if (reaction.message.partial) await reaction.message.fetch();

	if (reaction.partial) await reaction.fetch();

	switch (gamesArray[index].gameID) {
		case "sliding-puzzle":
		{
			handleSlidingPuzzle(gamesArray[index], reaction);
			break;
		}
	}

	removeReactions(reaction);
});

async function handleSlidingPuzzle(game, reaction) {
	let circleLocation = game.positionArray.findIndex(e => e === "⭕");
	let tempEmoji;

	let refreshIndex = gamesArray.findIndex(g => g.msgID === reaction.message.id);
	clearTimeout(gamesArray[refreshIndex].timeoutID);
	gamesArray[refreshIndex].timeoutID = setTimeout(async function() {
		await removeAllReactions(reaction.message);
		let index = gamesArray.findIndex(g => g.msgID === reaction.message.id);
		gamesArray.splice(index, 1);
	}, 30 * 60 * 1000);
	switch (reaction.emoji.name) {
		case "⬅": // left arrow
		{
			if (circleLocation % 4 !== 0) {
				tempEmoji = game.positionArray[circleLocation - 1];
				game.positionArray[circleLocation] = tempEmoji;
				game.positionArray[circleLocation - 1] = "⭕";
			}
			break;
		}
		case "➡": // right arrow
		{
			if (circleLocation % 4 !== 3) {
				tempEmoji = game.positionArray[circleLocation + 1];
				game.positionArray[circleLocation] = tempEmoji;
				game.positionArray[circleLocation + 1] = "⭕";
			}
			break;
		}
		case "⬇": // down arrow
		{
			if (circleLocation <= 11) {
				tempEmoji = game.positionArray[circleLocation + 4];
				game.positionArray[circleLocation] = tempEmoji;
				game.positionArray[circleLocation + 4] = "⭕";
			}
			break;
		}
		case "⬆": // up arrow
		{
			if (circleLocation >= 4) {
				tempEmoji = game.positionArray[circleLocation - 4];
				game.positionArray[circleLocation] = tempEmoji;
				game.positionArray[circleLocation - 4] = "⭕";
			}
			break;
		}
		case "❌":
		{
			await removeAllReactions(reaction.message);
			let index = gamesArray.findIndex(g => g.msgID === game.msgID);
			gamesArray.splice(index, 1);
			clearTimeout(game.timeoutID);
			break;
		}
	}
	await reaction.message.edit(getDisplayText(game.positionArray));
	let emojiOrder = game.positionArray.slice(0, 15).join();
	if (emojiOrder === puzzleArray.join()) {
		game.positionArray[15] = finalPiece;
		await reaction.message.edit(getDisplayText(game.positionArray));
		await removeAllReactions(reaction.message);
		let index = gamesArray.findIndex(g => g.msgID === reaction.message.id);
		gamesArray.splice(index, 1);
		clearTimeout(game.timeoutID);
	}
}

function getDisplayText(array) {
	return `:regional_indicator_m::regional_indicator_i::regional_indicator_k::regional_indicator_u:\n${array[0]}${array[1]}${array[2]}${array[3]}\n${array[4]}${array[5]}${array[6]}${array[7]}\n${array[8]}${array[9]}${array[10]}${array[11]}\n${array[12]}${array[13]}${array[14]}${array[15]}`;
}

async function removeReactions(reaction) {
	await reaction.users.fetch().then(reactionUsers => {
		let removeUsers = [];
		reactionUsers.forEach(u => {
			if (u.id !== client.user.id) {
				removeUsers.push(u.id);
			}
		});
		removeUsers.forEach(userId => {
			reaction.users.remove(userId).then().catch(e => log.info(e)); //Needs "Manage Messages" permission
		});
	});
}

async function removeAllReactions(message) {
	await message.reactions.removeAll();
}

function isSolvable(tiles) {
	var i = 0,
		j = 0,
		sum = 0,
		cnt = 0,
		len = 15;
	for (i = 0; i < len; i = i + 1) {
		cnt = 0;
		for (j = i + 1; j < len; j = j + 1) {
			if (tiles[j] + 1 < tiles[i] + 1) {
				cnt = cnt + 1;
			}
		}
		sum += cnt;
	}
	return 1 - ((sum + 4) % 2);
}
const Telegraf = require('telegraf');
const fs = require('fs');

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.on('message', ctx => parse(ctx));
bot.launch();

const sendPhotoById = (ctx, fileId) => {
    ctx.replyWithPhoto(fileId);
};

const parse = ctx => {
    if (ctx.updateSubTypes.length === 1) {
        const receivedMsg = ctx.update.message;
        const chat = receivedMsg.chat;

        const photosCommand = '/photo';

        let message = {
            id: ctx.update.update_id,
            date: undefined,
            type: undefined,
            sender: { id: undefined },
            chat: { id: undefined },
        };

        if (ctx.updateSubTypes.includes('text')) {
            if (
                receivedMsg.text.slice(0, photosCommand.length) === photosCommand &&
                receivedMsg.from.id.toString() === process.env.MD1GUY
            ) {
                const fileId = receivedMsg.text.substring(photosCommand.length + 1, receivedMsg.text.length);
                sendPhotoById(ctx, fileId);
                return;
            }

            message.type = 'text';
            message.text = receivedMsg.text;
        } else if (ctx.updateSubTypes.includes('photo')) {
            const photos = receivedMsg.photo;
            message.type = 'photo';
            message.fileId = photos[photos.length - 1].file_id;

            if (receivedMsg.caption) {
                message.text = receivedMsg.caption;
            }
        } else {
            // message.type = ctx.updateSubTypes[0];
            return;
        }

        if (receivedMsg.from.username) {
            message.sender.username = receivedMsg.from.username;
        }

        if (receivedMsg.from.first_name) {
            message.sender.firstName = receivedMsg.from.first_name;

            if (receivedMsg.from.last_name) {
                message.sender.lastName = receivedMsg.from.last_name;
            }
        }

        message.date = receivedMsg.date;
        message.sender.id = receivedMsg.from.id;

        if (chat.type === 'group' || chat.type === 'supergroup') {
            message.chat.type = 'group';
            message.chat.title = chat.title;
            message.chat.id = chat.id;
        } else if (chat.type === 'private') {
            message.chat = chat;
        } else {
            return;
        }

        log(message);

        const fileName = 'current.jsonlog';
        if (getFileSizeInMB(fileName) >= 1) renameFile(fileName, Date.now() + '.jsonlog');
        logToFile(message, fileName);
    }
};

const getFileSizeInMB = fileName => {
    const stats = fs.statSync(fileName);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes / 1000000.0;
};

const renameFile = (oldName, newName) => {
    fs.rename(oldName, newName, e => (e ? console.log('Error occured while renaming the file: ' + err) : null));
};

const logToFile = (message, fileName) => {
    fs.appendFile(fileName, '\n' + JSON.stringify(message), e => (e ? console.log(e) : null));
};

const log = message => {
    const sendDate = new Date(message.date * 1000);

    const sendDateHours =
        sendDate.getUTCHours() > 20
            ? (sendDate.getUTCHours() - 21).toString().padStart(2, '0')
            : (sendDate.getUTCHours() + 3).toString().padStart(2, '0');

    const sendDateMinutes = sendDate
        .getUTCMinutes()
        .toString()
        .padStart(2, '0');

    let senderName;
    let receiverName;
    let logString;

    if (message.sender.username) {
        senderName = `@${message.sender.username}`;
    } else if (message.sender.firstName) {
        senderName = message.sender.firstName;
        if (message.sender.lastName) {
            senderName += ` ${message.sender.lastName}`;
        }
    } else {
        senderName = 'undefinedSenderName';
    }

    senderName = senderName.padEnd(15, ' ');

    switch (message.chat.type) {
        case 'group':
            receiverName = message.chat.title;
            break;
        case 'private':
            receiverName = 'direct';
            break;
        default:
            receiverName = 'undefinedReceiverName';
            break;
    }

    switch (message.type) {
        case 'text':
            logString = message.text;
            break;
        case 'photo':
            logString = `Photo id: ${message.fileId}`;
            if (message.text) logString = `Caption: '${message.text}'\n${logString}`;
            break;
        default:
            // data = message.fileId ? `FILE_ID: ${message.fileId}` : 'undefinedMessageData';
            return;
    }

    const baseLogString = `${sendDateHours}:${sendDateMinutes} ${senderName} -> [${receiverName}]: '`;

    logString = `${baseLogString}${logString.replace(/(\r\n|\n|\r)/gm, '\n' + ' '.repeat(baseLogString.length))}'`;

    console.log(logString);
};

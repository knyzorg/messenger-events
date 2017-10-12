/*
 * This is an abstraction layer around facebook-chat-api to
 * allow more complex use cases such as reimplementing a
 * full-fledged chat client by injecting commonly desired
 * information such as the names of the users
 */

const login = require("facebook-chat-api");
/**
 * @param {Object} auth defines the `email` and `password` to login
 * @param {Object} options Options which will be directly passed to the chat library
 * @param {requestCallback} ready Will be called when the login sequence has been completed. Callback is either (false, err) or (true, {handlers, actions}).
*/
module.exports = (auth, options, ready) => {

    login(auth, (err, api) => {
        if (err) return ready(false, err);

        let h = {};
        let a = {};

        // Events to handle
        h = {
            // message
            message: Function,
            // N/A
            status: Function,
            // typ
            typing: Function,
            // read_receipt
            seen: Function,
            // message_reaction
            reaction: Function,
            // presence
            status: Function,
            // sticker
            sticker: Function,
            // file
            file: Function,
            // photo
            photo: Function,
            // animation
            animation: Function,
            // share
            share: Function,
            // video
            video: Function
        }

        ready(true, { handlers: h, actions: a });
        api.setOptions(options)


        // Allow easy lookup of names
        let userCache = {};
        function getUserInfo(id, callback) {
            if (userCache[id]) {
                return callback(userCache[id])
            }
            api.getUserInfo(id, (err, obj) => {
                //console.log(obj)
                if (err){
                    console.log(err);
                }
                userCache[id] = {};
                userCache[id].name = obj[id].name;
                userCache[id].id = id;
                userCache[id].thumb = obj[id].thumbsrc;
                callback(userCache[id])
            })
            /*api.getThreadList(0,20, (err, arr)=>{
                arr.forEach((thread)=>{
                    nameIDs[thread.threadID] = thread.name;
                    if (thread.threadID == id){
                        callback(thread.name)
                    }
                })
            })*/
        }

        function updateStatus(id, statuses, timestamp) {
            getUserInfo(id, (userInfo) => {
                let status = -1;
                if ((statuses == 0 && (status = false)) || (statuses == 2 && (status = true))) {
                    // 0 means offline, 2 means online
                    if (!userInfo.status || userInfo.status.isOnline != status) {
                        // User Status Changed
                        h.status({
                            user: userInfo,
                        }, {
                                online: status,
                                timestamp: timestamp
                            })
                    }
                    userCache[id].status = {
                        isOnline: status,
                        timestamp: timestamp
                    };

                }
            })
        }

        function getThreadInfo(threadID, callback) {
            api.getThreadInfo(threadID, (err, threadInfo) => {
                if (err) return callback({})
                threadInfo.sendMessage = (msg, cb) => api.sendMessage(msg, threadID, cb)
                threadInfo.id = threadID
                threadInfo.sendTypingIndicator = (cb) => api.sendTypingIndicator(threadID, cb)
                threadInfo.changeArchivedStatus = (archive, cb) => api.changeArchivedStatus(threadID, archive, cb)
                threadInfo.changeNickname = (nick, userid, cb) => api.changeNickname(nick, userid, threadID, cb)
                threadInfo.changeThreadColor = (color, cb) => api.changeThreadColor(color, threadID, cb)
                threadInfo.changeThreadEmoji = (emoji, cb) => api.changeThreadEmoji(emoji, threadID, cb)
                threadInfo.deleteThread = (cb) => api.deleteThread(threadID, cb)
                threadInfo.getThreadHistory = (amount, timestamp, cb) => api.getThreadHistory(threadID, amount, timestamp, cb)
                threadInfo.getThreadInfo = (cb) => api.getThreadInfo(threadID, cb)
                threadInfo.getThreadPictures = (offset, limit, cb) => api.getThreadPictures(threadID, offset, limit, cb)
                threadInfo.markAsRead = (cb) => api.markAsRead(threadID, cb)
                threadInfo.muteThread = (seconds, cb) => api.muteThread(threadID, seconds, cb)
                if (!threadInfo.isCanonical) {
                    threadInfo.setTitle = (newTitle, cb) => api.setTitle(newTitle, threadID, cb)
                    threadInfo.addUserToGroup = (userid, cb) => api.addUserToGroup(userid, threadID, cb)
                    threadInfo.removeUserFromGroup = (userid, cb) => api.removeUserFromGroup(userid, threadID, cb)
                    threadInfo.changeGroupImage = (image, cb) => api.changeGroupImage(image, threadID, cb)
                    threadInfo.createPoll = (title, options, cb) => api.createPoll(title, threadID, options, cb)
                    
                }

                callback(threadInfo)
            })
        }
        api.listen((err, $) => {
            //api.sendMessage(message.body, message.threadID);
            console.log($.threadID, $.type, JSON.stringify($))
            switch ($.type) {
                case "presence":
                    updateStatus($.userID, $.statuses)
                    break;
                case "message":
                    getUserInfo($.senderID, (userInfo) => {
                        getThreadInfo($.threadID, (threadInfo) => {
                            h.message({
                                user: userInfo,
                                thread: threadInfo,
                            }, {
                                    id: $.messageID,
                                    body: $.body,
                                    attachments: $.attachments
                                })
                            $.attachments.forEach((attachment) => {
                                switch (attachment.type) {
                                    case "sticker":
                                        h.sticker({
                                            user: userInfo,
                                            thread: threadInfo,
                                        }, {
                                                id: attachment.stickerID,
                                                url: attachment.url,
                                                size: {
                                                    height: attachment.height,
                                                    width: attachment.width
                                                }
                                            })
                                        break;
                                }

                            })
                        })

                    })
                    break;
                case "typ":

                    break;
            }
        });
    });
}

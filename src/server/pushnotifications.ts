import { PushNotification } from "../apis/pushnotifications";
import { Firehose, FirehoseEvent, FirehoseSubscriber } from "./firehose";
import { CachingIdToStringsStore, FileIdToStringsStore } from "./keyvalue-store";
import * as admin from "firebase-admin";
import { applicationDefault } from "firebase-admin/app";

const registrationsFile = "docker/data/registrations.kvdb";
const registrations = new CachingIdToStringsStore(new FileIdToStringsStore(registrationsFile));
const queue: PushNotification[] = [];

export async function initializePushNotifications(firehose: Firehose) {
    const stats = {
        numPushMessages: 0,
    };

    await registrations.initialize();
    const firebase = admin.initializeApp({ credential: applicationDefault() });
    const pushService = firebase.messaging();

    console.log("Initialized push notifications " + pushService);

    firehose.listeners.push(async (event: FirehoseEvent) => {
        if (event.fromDid == event.toDid) return;
        const tokens = await registrations.get(event.toDid);
        if (!tokens) return;
        queue.push({ ...event, tokens: tokens as string[] });
    });

    // Push messaging queue
    setInterval(() => {
        const queueCopy = [...queue];
        queue.length = 0;
        for (const notification of queueCopy) {
            const data = { ...notification } as any;
            delete data.tokens;
            if (notification.tokens) {
                for (const token of notification.tokens) {
                    try {
                        stats.numPushMessages++;
                        pushService
                            .send({ token, data })
                            .then(() => {
                                console.log("Sent " + JSON.stringify(notification));
                            })
                            .catch((reason) => {
                                console.error("Couldn't send notification, removing token", reason);
                                registrations.remove(notification.toDid, token);
                            });
                    } catch (e) {}
                }
            }
        }
    }, 1000);

    return { stats, registrations };
}

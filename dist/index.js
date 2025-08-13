import IPCModule from 'node-ipc';
import { EventEmitter } from 'tseep';
/**
 * Handles Inter-Process Communication (IPC) via. server/socket
 *
 * @example
 * // Simple echo example
 * const ipc = new IPC('echo');
 *
 * ipc.on('connect', () => {
 *   console.log('Connected');
 *   ipc.send(ipc.name, { hello: 'world!' });
 * });
 *
 * ipc.on('disconnect', () => console.log('Disconnected'));
 *
 * ipc.on('message', (message: Message) => {
 *   console.log(`Message:`, message);
 * });
 */
export default class IPC extends EventEmitter {
    name;
    ready;
    ipc;
    constructor(name, debug = false) {
        super();
        this.name = name;
        this.ready = false;
        this.ipc = IPCModule;
        this.ipc.config.appspace = 'pygmy.';
        this.ipc.config.id = name;
        this.ipc.config.retry = 2500;
        this.ipc.config.maxRetries = 5;
        this.ipc.config.logger = debug ? console.log.bind(this) : () => null;
    }
    /**
     * Connect to the IPC server/socket
     */
    connect() {
        this.ipc.connectTo('ipc', () => {
            this.ipc.of.ipc?.on('connect', () => this.onConnect());
            this.ipc.of.ipc?.on('disconnect', () => this.onDisconnect());
            this.ipc.of.ipc?.on('ready', () => this.onReady());
            this.ipc.of.ipc?.on('message', (raw) => {
                const data = JSON.parse(raw);
                this.onMessage(data);
            });
        });
    }
    /**
     * Send a message to another process via. IPC
     * @param to Who to send the message to
     * @param data JSON data to send to the process
     */
    send(to, data) {
        if (!this.ready)
            return;
        const message = {
            from: this.name,
            to,
            payload: JSON.stringify(data)
        };
        this.ipc.of.ipc?.emit('message', message);
    }
    onConnect() {
        this.ipc.of.ipc?.emit('identify', {
            from: this.name
        });
    }
    onDisconnect() {
        this.emit('disconnect');
    }
    onReady() {
        this.emit('connect');
        this.ready = true;
    }
    onMessage(raw) {
        const message = {
            from: raw.from,
            to: raw.to,
            payload: JSON.parse(raw.payload)
        };
        this.emit('message', message);
    }
}

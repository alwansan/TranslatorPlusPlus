/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
/**
 * BasicEventHandler's event. This itself extends the standard Event API for html element. So, you can use the default element's event such as click, focus, blur, etc.
 * Methods that uses Event are: `on()`, `off()`, `one()`, `trigger()`
 * @typedef BasicEventHandler#Event
 * @type {Event}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
 */

/**
 * Javascript's Promise type event handler.
 * The state will switch from **off** to **on** once. And after that, it will stay in that state forever, so any further `until()` call will be resolved immidiately.
 * Methods that uses Event are: `until()`, `resolveState()`, `rejectState()`
 * @typedef BasicEventHandler#State
 * @type {Promise}
 * @since 4.12.1
 */

/**
 * @class
 * @classdesc
 * The basic event handler for classes
 * This class will generates JQuery on, off, one, trigger events
 * And will add onReady hook
 */
class BasicEventHandler {
    constructor ($elm) {
        this.__switches = [];

		var waitForStates = {}
		
		/**
		 * State monitor. Wait until a state is resolved.
		 * Will wait until resolveState is called.
		 * Will immidiately executed if resolveState is already called
		 * @async
		 * @param {String} state - State name
		 * @returns {Promise<*>} - Returns any variables passed on resolveState
		 * @since 4.12.4
		 * @example <caption>Basic usage</caption>
		 * await basicEventHandler.until("ready");
		 * 
		 * @example <caption>Asynchronous chaining</caption>
		 * basicEventHandler.until("ready")
		 * .then((result) = >{
		 * 	console.log(result);
		 * })
		 * 
		 * basicEventHandler.resolveState("ready", "Hello world");
		 * // prints: Hello world
		 * 
		 * @example <caption>Immidiately executed if `resolveState` with the same state has already been called</caption>
		 * basicEventHandler.resolveState("ready", "App is ready");
		 * 
		 * var msg = await basicEventHandler.until("ready");
		 * console.log(msg);
		 * //immidately prints "App is ready"
		 */
		this.until = async function(state) {
			if (waitForStates[state]) return waitForStates[state].promise;
			var prom = new Promise((resolve, reject) => {
				waitForStates[state] = {
					resolve:resolve,
					reject:reject,
					state:"waiting"
				}
			})
			waitForStates[state].promise = prom;
			return prom;
		}

		/**
		 * Resolve a state
		 * @param {String} state - State name 
		 * @param {*} [arg] - Arguments to be passed to `until`
		 */
		this.resolveState = function(state, arg) {
			if (!waitForStates[state]) {
				var prom = new Promise((resolve, reject) => {
					waitForStates[state] = {
						resolve:resolve,
						reject:reject,
						state:"resolved"
					}
				})
				waitForStates[state].promise = prom;
			}
			waitForStates[state].resolve(arg)
		}

		this.unresolveState = function(state) {
			delete waitForStates[state]
		}

		/**
		 * Reject a state
		 * @param {String} state - State name 
		 * @param {String} [error] - Error message 
		 */
		this.rejectState = function(state, error="") {
			if (!waitForStates[state]) {
				var prom = new Promise((resolve, reject) => {
					waitForStates[state] = {
						resolve:resolve,
						reject:reject,
						state:"rejected"
					}
				})
				waitForStates[state].promise = prom;
			}
			if (error) {
				waitForStates[state].reject();
			} else {
				waitForStates[state].reject(new Error(error));
			}
		}

		var processors = {}
		/**
		 * Add a custom process to a value.
		 * @param {String} processName - Name of the process
		 * @param {*} value - Value to be processed
		 * @returns {*} - By default will return value as is
		 */
		this.processWith = function(processName, value, ...args) {
			if (typeof processors[processName] !== "function") return value;
			return processors[processName].apply(this, [].concat(value, args))
		}

		this.defineProcess = function(processName, process) {
			if (typeof process !== "function") return console.warn("Invalid process")
			if (typeof processName !== "string") return console.warn("Invalid processName")
			processors[processName] = process;
		}
		this.removeProcess = function(processName) {
			if (processors[processName]) delete processors[processName];
		}


		if ($elm && typeof window !== "undefined") {
			this.$elm = $elm || $("<div></div>");
			// jquery event
			/**
			 * Create a new event with JQuery eventing convenience
			 * Equal to `$(document).on()`
			 * @param {String} evt - Event name
			 * @param {Function} fn - Function to trigger
			 * @since 4.3.20
			 * trans.on('transLoaded', (e, opt)=> {
			 * 	// do something
			 * })
			 */
			this.on = function(evt, fn) {
				this.$elm.on(evt, fn);
				return this;
			}

			/**
			 * Removes an event
			 * Equal to `$(document).off()`
			 * @param {String} evt - Event name
			 * @param {Function} fn - Function to trigger
			 * @since 4.3.20
			 * @example
			 * trans.off('transLoaded', (e, opt)=> {
			 * 	// do something
			 * })
			 */
			this.off = function(evt) {
				this.$elm.off(evt);
				return this;
			}

			/**
			 * Run the event once
			 * Trigger an event and immediately removes it
			 * Equal to `$(document).one()`
			 * @param {String} evt - Event name
			 * @param {Function} fn - Function to trigger
			 * @since 4.3.20
			 */
			this.one = function(evt, fn) {
				this.$elm.one(evt, fn);
                return this;
			}

			/**
			 * Trigger an event
			 * Equal to `$(document).trigger()`
			 * @param {String} evt - Event name
			 * @param {Function} fn - Function to trigger
			 * @since 4.3.20
			 */
			this.trigger = function(evt, param) {
				this.$elm.trigger(evt, param);
                return this;
			}
		} else {
            // Node.js implementation with EventEmitter
            const EventEmitter = require("events");
            const eventEmitter = new EventEmitter();

            /**
             * Create a new event
             * @param {String} evt - Event name (can include .scope)
             * @param {Function} fn - Function to trigger
             */
            this.on = function(evt, fn) {
                const [eventName, scope] = evt.split(".");
                const wrappedFn = (...args) => {
					const thisArgs = [eventEmitter, ...args];
					fn.apply(this, thisArgs);
				}
                
                if (scope) {
                    wrappedFn._scope = scope;
                    eventEmitter.on(eventName, wrappedFn);
                } else {
                    eventEmitter.on(evt, wrappedFn);
                }
                return this;
            };

            /**
             * Removes an event
             * @param {String} evt - Event name (can include .scope)
             */
            this.off = function(evt) {
                const [eventName, scope] = evt.split(".");
                
                if (scope) {
                    const listeners = eventEmitter.listeners(eventName);
                    for (const listener of listeners) {
                        if (listener._scope === scope) {
                            eventEmitter.off(eventName, listener);
                        }
                    }
                } else {
                    eventEmitter.removeAllListeners(evt);
                }
                return this;
            };

            /**
             * Run the event once
             * @param {String} evt - Event name (can include .scope)
             * @param {Function} fn - Function to trigger
             */
            this.one = function(evt, fn) {
                const wrappedFn = (...args) => {
                    fn.apply(this, args);
                    this.off(evt);
                };
                this.on(evt, wrappedFn);
                return this;
            };

            /**
             * Trigger an event
             * @param {String} evt - Event name (can include .scope)
             * @param {...*} params - Event parameters
             */
            this.trigger = function(evt, ...params) {
                const [eventName, scope] = evt.split(".");
                
                if (scope) {
                    const listeners = eventEmitter.listeners(eventName);
                    for (const listener of listeners) {
                        if (listener._scope === scope) {
                            listener(...params);
                        }
                    }
                } else {
                    eventEmitter.emit(evt, ...params);
                }
                return this;
            };
        
		}

		BasicEventHandler.prototype.onReady = function (onReadyEvent) {
			if (typeof onReadyEvent !== 'function') return console.error("Error triggering onReady : parameter must be a function");
			this.__onReadyPool = this.__onReadyPool||[];
			
			if (Boolean(this.isInitialized) == false) {
				this.__onReadyPool.push(onReadyEvent)
			} else {
				for (var i=0; i<this.__onReadyPool.length; i++) {
					this.__onReadyPool[i].apply(this, arguments);
				}
				this.__onReadyPool = [];
				
				onReadyEvent.apply(this, arguments);
			}
		}
    }
}

BasicEventHandler.applyTo = function (obj, element) {
	const basicEventHandler = new BasicEventHandler(element);
	for (var key in basicEventHandler) {
		obj[key] = basicEventHandler[key];
	}
	return obj;
}

module.exports = BasicEventHandler;
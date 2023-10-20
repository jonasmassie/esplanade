
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop$1;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function addUniqueItem(array, item) {
        array.indexOf(item) === -1 && array.push(item);
    }

    const clamp = (min, max, v) => Math.min(Math.max(v, min), max);

    const defaults = {
        duration: 0.3,
        delay: 0,
        endDelay: 0,
        repeat: 0,
        easing: "ease",
    };

    const isNumber = (value) => typeof value === "number";

    const isEasingList = (easing) => Array.isArray(easing) && !isNumber(easing[0]);

    const wrap$1 = (min, max, v) => {
        const rangeSize = max - min;
        return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
    };

    function getEasingForSegment(easing, i) {
        return isEasingList(easing)
            ? easing[wrap$1(0, easing.length, i)]
            : easing;
    }

    const mix = (min, max, progress) => -progress * min + progress * max + min;

    const noop = () => { };
    const noopReturn = (v) => v;

    const progress = (min, max, value) => max - min === 0 ? 1 : (value - min) / (max - min);

    function fillOffset(offset, remaining) {
        const min = offset[offset.length - 1];
        for (let i = 1; i <= remaining; i++) {
            const offsetProgress = progress(0, remaining, i);
            offset.push(mix(min, 1, offsetProgress));
        }
    }
    function defaultOffset(length) {
        const offset = [0];
        fillOffset(offset, length - 1);
        return offset;
    }

    function interpolate(output, input = defaultOffset(output.length), easing = noopReturn) {
        const length = output.length;
        /**
         * If the input length is lower than the output we
         * fill the input to match. This currently assumes the input
         * is an animation progress value so is a good candidate for
         * moving outside the function.
         */
        const remainder = length - input.length;
        remainder > 0 && fillOffset(input, remainder);
        return (t) => {
            let i = 0;
            for (; i < length - 2; i++) {
                if (t < input[i + 1])
                    break;
            }
            let progressInRange = clamp(0, 1, progress(input[i], input[i + 1], t));
            const segmentEasing = getEasingForSegment(easing, i);
            progressInRange = segmentEasing(progressInRange);
            return mix(output[i], output[i + 1], progressInRange);
        };
    }

    const isCubicBezier = (easing) => Array.isArray(easing) && isNumber(easing[0]);

    const isEasingGenerator = (easing) => typeof easing === "object" &&
        Boolean(easing.createAnimation);

    const isFunction = (value) => typeof value === "function";

    const isString = (value) => typeof value === "string";

    const time = {
        ms: (seconds) => seconds * 1000,
        s: (milliseconds) => milliseconds / 1000,
    };

    /*
      Bezier function generator

      This has been modified from Gaëtan Renaudeau's BezierEasing
      https://github.com/gre/bezier-easing/blob/master/src/index.js
      https://github.com/gre/bezier-easing/blob/master/LICENSE
      
      I've removed the newtonRaphsonIterate algo because in benchmarking it
      wasn't noticiably faster than binarySubdivision, indeed removing it
      usually improved times, depending on the curve.

      I also removed the lookup table, as for the added bundle size and loop we're
      only cutting ~4 or so subdivision iterations. I bumped the max iterations up
      to 12 to compensate and this still tended to be faster for no perceivable
      loss in accuracy.

      Usage
        const easeOut = cubicBezier(.17,.67,.83,.67);
        const x = easeOut(0.5); // returns 0.627...
    */
    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    const calcBezier = (t, a1, a2) => (((1.0 - 3.0 * a2 + 3.0 * a1) * t + (3.0 * a2 - 6.0 * a1)) * t + 3.0 * a1) * t;
    const subdivisionPrecision = 0.0000001;
    const subdivisionMaxIterations = 12;
    function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
        let currentX;
        let currentT;
        let i = 0;
        do {
            currentT = lowerBound + (upperBound - lowerBound) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - x;
            if (currentX > 0.0) {
                upperBound = currentT;
            }
            else {
                lowerBound = currentT;
            }
        } while (Math.abs(currentX) > subdivisionPrecision &&
            ++i < subdivisionMaxIterations);
        return currentT;
    }
    function cubicBezier(mX1, mY1, mX2, mY2) {
        // If this is a linear gradient, return linear easing
        if (mX1 === mY1 && mX2 === mY2)
            return noopReturn;
        const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
        // If animation is at start/end, return t without easing
        return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
    }

    const steps = (steps, direction = "end") => (progress) => {
        progress =
            direction === "end"
                ? Math.min(progress, 0.999)
                : Math.max(progress, 0.001);
        const expanded = progress * steps;
        const rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
        return clamp(0, 1, rounded / steps);
    };

    const namedEasings = {
        ease: cubicBezier(0.25, 0.1, 0.25, 1.0),
        "ease-in": cubicBezier(0.42, 0.0, 1.0, 1.0),
        "ease-in-out": cubicBezier(0.42, 0.0, 0.58, 1.0),
        "ease-out": cubicBezier(0.0, 0.0, 0.58, 1.0),
    };
    const functionArgsRegex = /\((.*?)\)/;
    function getEasingFunction(definition) {
        // If already an easing function, return
        if (isFunction(definition))
            return definition;
        // If an easing curve definition, return bezier function
        if (isCubicBezier(definition))
            return cubicBezier(...definition);
        // If we have a predefined easing function, return
        if (namedEasings[definition])
            return namedEasings[definition];
        // If this is a steps function, attempt to create easing curve
        if (definition.startsWith("steps")) {
            const args = functionArgsRegex.exec(definition);
            if (args) {
                const argsArray = args[1].split(",");
                return steps(parseFloat(argsArray[0]), argsArray[1].trim());
            }
        }
        return noopReturn;
    }

    class Animation {
        constructor(output, keyframes = [0, 1], { easing, duration: initialDuration = defaults.duration, delay = defaults.delay, endDelay = defaults.endDelay, repeat = defaults.repeat, offset, direction = "normal", } = {}) {
            this.startTime = null;
            this.rate = 1;
            this.t = 0;
            this.cancelTimestamp = null;
            this.easing = noopReturn;
            this.duration = 0;
            this.totalDuration = 0;
            this.repeat = 0;
            this.playState = "idle";
            this.finished = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
            easing = easing || defaults.easing;
            if (isEasingGenerator(easing)) {
                const custom = easing.createAnimation(keyframes);
                easing = custom.easing;
                keyframes = custom.keyframes || keyframes;
                initialDuration = custom.duration || initialDuration;
            }
            this.repeat = repeat;
            this.easing = isEasingList(easing) ? noopReturn : getEasingFunction(easing);
            this.updateDuration(initialDuration);
            const interpolate$1 = interpolate(keyframes, offset, isEasingList(easing) ? easing.map(getEasingFunction) : noopReturn);
            this.tick = (timestamp) => {
                var _a;
                // TODO: Temporary fix for OptionsResolver typing
                delay = delay;
                let t = 0;
                if (this.pauseTime !== undefined) {
                    t = this.pauseTime;
                }
                else {
                    t = (timestamp - this.startTime) * this.rate;
                }
                this.t = t;
                // Convert to seconds
                t /= 1000;
                // Rebase on delay
                t = Math.max(t - delay, 0);
                /**
                 * If this animation has finished, set the current time
                 * to the total duration.
                 */
                if (this.playState === "finished" && this.pauseTime === undefined) {
                    t = this.totalDuration;
                }
                /**
                 * Get the current progress (0-1) of the animation. If t is >
                 * than duration we'll get values like 2.5 (midway through the
                 * third iteration)
                 */
                const progress = t / this.duration;
                // TODO progress += iterationStart
                /**
                 * Get the current iteration (0 indexed). For instance the floor of
                 * 2.5 is 2.
                 */
                let currentIteration = Math.floor(progress);
                /**
                 * Get the current progress of the iteration by taking the remainder
                 * so 2.5 is 0.5 through iteration 2
                 */
                let iterationProgress = progress % 1.0;
                if (!iterationProgress && progress >= 1) {
                    iterationProgress = 1;
                }
                /**
                 * If iteration progress is 1 we count that as the end
                 * of the previous iteration.
                 */
                iterationProgress === 1 && currentIteration--;
                /**
                 * Reverse progress if we're not running in "normal" direction
                 */
                const iterationIsOdd = currentIteration % 2;
                if (direction === "reverse" ||
                    (direction === "alternate" && iterationIsOdd) ||
                    (direction === "alternate-reverse" && !iterationIsOdd)) {
                    iterationProgress = 1 - iterationProgress;
                }
                const p = t >= this.totalDuration ? 1 : Math.min(iterationProgress, 1);
                const latest = interpolate$1(this.easing(p));
                output(latest);
                const isAnimationFinished = this.pauseTime === undefined &&
                    (this.playState === "finished" || t >= this.totalDuration + endDelay);
                if (isAnimationFinished) {
                    this.playState = "finished";
                    (_a = this.resolve) === null || _a === void 0 ? void 0 : _a.call(this, latest);
                }
                else if (this.playState !== "idle") {
                    this.frameRequestId = requestAnimationFrame(this.tick);
                }
            };
            this.play();
        }
        play() {
            const now = performance.now();
            this.playState = "running";
            if (this.pauseTime !== undefined) {
                this.startTime = now - this.pauseTime;
            }
            else if (!this.startTime) {
                this.startTime = now;
            }
            this.cancelTimestamp = this.startTime;
            this.pauseTime = undefined;
            this.frameRequestId = requestAnimationFrame(this.tick);
        }
        pause() {
            this.playState = "paused";
            this.pauseTime = this.t;
        }
        finish() {
            this.playState = "finished";
            this.tick(0);
        }
        stop() {
            var _a;
            this.playState = "idle";
            if (this.frameRequestId !== undefined) {
                cancelAnimationFrame(this.frameRequestId);
            }
            (_a = this.reject) === null || _a === void 0 ? void 0 : _a.call(this, false);
        }
        cancel() {
            this.stop();
            this.tick(this.cancelTimestamp);
        }
        reverse() {
            this.rate *= -1;
        }
        commitStyles() { }
        updateDuration(duration) {
            this.duration = duration;
            this.totalDuration = duration * (this.repeat + 1);
        }
        get currentTime() {
            return this.t;
        }
        set currentTime(t) {
            if (this.pauseTime !== undefined || this.rate === 0) {
                this.pauseTime = t;
            }
            else {
                this.startTime = performance.now() - t / this.rate;
            }
        }
        get playbackRate() {
            return this.rate;
        }
        set playbackRate(rate) {
            this.rate = rate;
        }
    }

    var invariant = function () { };
    {
        invariant = function (check, message) {
            if (!check) {
                throw new Error(message);
            }
        };
    }

    /**
     * The MotionValue tracks the state of a single animatable
     * value. Currently, updatedAt and current are unused. The
     * long term idea is to use this to minimise the number
     * of DOM reads, and to abstract the DOM interactions here.
     */
    class MotionValue {
        setAnimation(animation) {
            this.animation = animation;
            animation === null || animation === void 0 ? void 0 : animation.finished.then(() => this.clearAnimation()).catch(() => { });
        }
        clearAnimation() {
            this.animation = this.generator = undefined;
        }
    }

    const data = new WeakMap();
    function getAnimationData(element) {
        if (!data.has(element)) {
            data.set(element, {
                transforms: [],
                values: new Map(),
            });
        }
        return data.get(element);
    }
    function getMotionValue(motionValues, name) {
        if (!motionValues.has(name)) {
            motionValues.set(name, new MotionValue());
        }
        return motionValues.get(name);
    }

    /**
     * A list of all transformable axes. We'll use this list to generated a version
     * of each axes for each transform.
     */
    const axes = ["", "X", "Y", "Z"];
    /**
     * An ordered array of each transformable value. By default, transform values
     * will be sorted to this order.
     */
    const order = ["translate", "scale", "rotate", "skew"];
    const transformAlias = {
        x: "translateX",
        y: "translateY",
        z: "translateZ",
    };
    const rotation = {
        syntax: "<angle>",
        initialValue: "0deg",
        toDefaultUnit: (v) => v + "deg",
    };
    const baseTransformProperties = {
        translate: {
            syntax: "<length-percentage>",
            initialValue: "0px",
            toDefaultUnit: (v) => v + "px",
        },
        rotate: rotation,
        scale: {
            syntax: "<number>",
            initialValue: 1,
            toDefaultUnit: noopReturn,
        },
        skew: rotation,
    };
    const transformDefinitions = new Map();
    const asTransformCssVar = (name) => `--motion-${name}`;
    /**
     * Generate a list of every possible transform key
     */
    const transforms = ["x", "y", "z"];
    order.forEach((name) => {
        axes.forEach((axis) => {
            transforms.push(name + axis);
            transformDefinitions.set(asTransformCssVar(name + axis), baseTransformProperties[name]);
        });
    });
    /**
     * A function to use with Array.sort to sort transform keys by their default order.
     */
    const compareTransformOrder = (a, b) => transforms.indexOf(a) - transforms.indexOf(b);
    /**
     * Provide a quick way to check if a string is the name of a transform
     */
    const transformLookup = new Set(transforms);
    const isTransform = (name) => transformLookup.has(name);
    const addTransformToElement = (element, name) => {
        // Map x to translateX etc
        if (transformAlias[name])
            name = transformAlias[name];
        const { transforms } = getAnimationData(element);
        addUniqueItem(transforms, name);
        /**
         * TODO: An optimisation here could be to cache the transform in element data
         * and only update if this has changed.
         */
        element.style.transform = buildTransformTemplate(transforms);
    };
    const buildTransformTemplate = (transforms) => transforms
        .sort(compareTransformOrder)
        .reduce(transformListToString, "")
        .trim();
    const transformListToString = (template, name) => `${template} ${name}(var(${asTransformCssVar(name)}))`;

    const isCssVar = (name) => name.startsWith("--");
    const registeredProperties = new Set();
    function registerCssVariable(name) {
        if (registeredProperties.has(name))
            return;
        registeredProperties.add(name);
        try {
            const { syntax, initialValue } = transformDefinitions.has(name)
                ? transformDefinitions.get(name)
                : {};
            CSS.registerProperty({
                name,
                inherits: false,
                syntax,
                initialValue,
            });
        }
        catch (e) { }
    }

    const testAnimation = (keyframes, options) => document.createElement("div").animate(keyframes, options);
    const featureTests = {
        cssRegisterProperty: () => typeof CSS !== "undefined" &&
            Object.hasOwnProperty.call(CSS, "registerProperty"),
        waapi: () => Object.hasOwnProperty.call(Element.prototype, "animate"),
        partialKeyframes: () => {
            try {
                testAnimation({ opacity: [1] });
            }
            catch (e) {
                return false;
            }
            return true;
        },
        finished: () => Boolean(testAnimation({ opacity: [0, 1] }, { duration: 0.001 }).finished),
        linearEasing: () => {
            try {
                testAnimation({ opacity: 0 }, { easing: "linear(0, 1)" });
            }
            catch (e) {
                return false;
            }
            return true;
        },
    };
    const results = {};
    const supports = {};
    for (const key in featureTests) {
        supports[key] = () => {
            if (results[key] === undefined)
                results[key] = featureTests[key]();
            return results[key];
        };
    }

    // Create a linear easing point for every x second
    const resolution = 0.015;
    const generateLinearEasingPoints = (easing, duration) => {
        let points = "";
        const numPoints = Math.round(duration / resolution);
        for (let i = 0; i < numPoints; i++) {
            points += easing(progress(0, numPoints - 1, i)) + ", ";
        }
        return points.substring(0, points.length - 2);
    };
    const convertEasing = (easing, duration) => {
        if (isFunction(easing)) {
            return supports.linearEasing()
                ? `linear(${generateLinearEasingPoints(easing, duration)})`
                : defaults.easing;
        }
        else {
            return isCubicBezier(easing) ? cubicBezierAsString(easing) : easing;
        }
    };
    const cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;

    function hydrateKeyframes(keyframes, readInitialValue) {
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i] === null) {
                keyframes[i] = i ? keyframes[i - 1] : readInitialValue();
            }
        }
        return keyframes;
    }
    const keyframesList = (keyframes) => Array.isArray(keyframes) ? keyframes : [keyframes];

    function getStyleName(key) {
        if (transformAlias[key])
            key = transformAlias[key];
        return isTransform(key) ? asTransformCssVar(key) : key;
    }

    const style = {
        get: (element, name) => {
            name = getStyleName(name);
            let value = isCssVar(name)
                ? element.style.getPropertyValue(name)
                : getComputedStyle(element)[name];
            if (!value && value !== 0) {
                const definition = transformDefinitions.get(name);
                if (definition)
                    value = definition.initialValue;
            }
            return value;
        },
        set: (element, name, value) => {
            name = getStyleName(name);
            if (isCssVar(name)) {
                element.style.setProperty(name, value);
            }
            else {
                element.style[name] = value;
            }
        },
    };

    function stopAnimation(animation, needsCommit = true) {
        if (!animation || animation.playState === "finished")
            return;
        // Suppress error thrown by WAAPI
        try {
            if (animation.stop) {
                animation.stop();
            }
            else {
                needsCommit && animation.commitStyles();
                animation.cancel();
            }
        }
        catch (e) { }
    }

    function getUnitConverter(keyframes, definition) {
        var _a;
        let toUnit = (definition === null || definition === void 0 ? void 0 : definition.toDefaultUnit) || noopReturn;
        const finalKeyframe = keyframes[keyframes.length - 1];
        if (isString(finalKeyframe)) {
            const unit = ((_a = finalKeyframe.match(/(-?[\d.]+)([a-z%]*)/)) === null || _a === void 0 ? void 0 : _a[2]) || "";
            if (unit)
                toUnit = (value) => value + unit;
        }
        return toUnit;
    }

    function getDevToolsRecord() {
        return window.__MOTION_DEV_TOOLS_RECORD;
    }
    function animateStyle(element, key, keyframesDefinition, options = {}, AnimationPolyfill) {
        const record = getDevToolsRecord();
        const isRecording = options.record !== false && record;
        let animation;
        let { duration = defaults.duration, delay = defaults.delay, endDelay = defaults.endDelay, repeat = defaults.repeat, easing = defaults.easing, persist = false, direction, offset, allowWebkitAcceleration = false, } = options;
        const data = getAnimationData(element);
        const valueIsTransform = isTransform(key);
        let canAnimateNatively = supports.waapi();
        /**
         * If this is an individual transform, we need to map its
         * key to a CSS variable and update the element's transform style
         */
        valueIsTransform && addTransformToElement(element, key);
        const name = getStyleName(key);
        const motionValue = getMotionValue(data.values, name);
        /**
         * Get definition of value, this will be used to convert numerical
         * keyframes into the default value type.
         */
        const definition = transformDefinitions.get(name);
        /**
         * Stop the current animation, if any. Because this will trigger
         * commitStyles (DOM writes) and we might later trigger DOM reads,
         * this is fired now and we return a factory function to create
         * the actual animation that can get called in batch,
         */
        stopAnimation(motionValue.animation, !(isEasingGenerator(easing) && motionValue.generator) &&
            options.record !== false);
        /**
         * Batchable factory function containing all DOM reads.
         */
        return () => {
            const readInitialValue = () => { var _a, _b; return (_b = (_a = style.get(element, name)) !== null && _a !== void 0 ? _a : definition === null || definition === void 0 ? void 0 : definition.initialValue) !== null && _b !== void 0 ? _b : 0; };
            /**
             * Replace null values with the previous keyframe value, or read
             * it from the DOM if it's the first keyframe.
             */
            let keyframes = hydrateKeyframes(keyframesList(keyframesDefinition), readInitialValue);
            /**
             * Detect unit type of keyframes.
             */
            const toUnit = getUnitConverter(keyframes, definition);
            if (isEasingGenerator(easing)) {
                const custom = easing.createAnimation(keyframes, key !== "opacity", readInitialValue, name, motionValue);
                easing = custom.easing;
                keyframes = custom.keyframes || keyframes;
                duration = custom.duration || duration;
            }
            /**
             * If this is a CSS variable we need to register it with the browser
             * before it can be animated natively. We also set it with setProperty
             * rather than directly onto the element.style object.
             */
            if (isCssVar(name)) {
                if (supports.cssRegisterProperty()) {
                    registerCssVariable(name);
                }
                else {
                    canAnimateNatively = false;
                }
            }
            /**
             * If we've been passed a custom easing function, and this browser
             * does **not** support linear() easing, and the value is a transform
             * (and thus a pure number) we can still support the custom easing
             * by falling back to the animation polyfill.
             */
            if (valueIsTransform &&
                !supports.linearEasing() &&
                (isFunction(easing) || (isEasingList(easing) && easing.some(isFunction)))) {
                canAnimateNatively = false;
            }
            /**
             * If we can animate this value with WAAPI, do so.
             */
            if (canAnimateNatively) {
                /**
                 * Convert numbers to default value types. Currently this only supports
                 * transforms but it could also support other value types.
                 */
                if (definition) {
                    keyframes = keyframes.map((value) => isNumber(value) ? definition.toDefaultUnit(value) : value);
                }
                /**
                 * If this browser doesn't support partial/implicit keyframes we need to
                 * explicitly provide one.
                 */
                if (keyframes.length === 1 &&
                    (!supports.partialKeyframes() || isRecording)) {
                    keyframes.unshift(readInitialValue());
                }
                const animationOptions = {
                    delay: time.ms(delay),
                    duration: time.ms(duration),
                    endDelay: time.ms(endDelay),
                    easing: !isEasingList(easing)
                        ? convertEasing(easing, duration)
                        : undefined,
                    direction,
                    iterations: repeat + 1,
                    fill: "both",
                };
                animation = element.animate({
                    [name]: keyframes,
                    offset,
                    easing: isEasingList(easing)
                        ? easing.map((thisEasing) => convertEasing(thisEasing, duration))
                        : undefined,
                }, animationOptions);
                /**
                 * Polyfill finished Promise in browsers that don't support it
                 */
                if (!animation.finished) {
                    animation.finished = new Promise((resolve, reject) => {
                        animation.onfinish = resolve;
                        animation.oncancel = reject;
                    });
                }
                const target = keyframes[keyframes.length - 1];
                animation.finished
                    .then(() => {
                    if (persist)
                        return;
                    // Apply styles to target
                    style.set(element, name, target);
                    // Ensure fill modes don't persist
                    animation.cancel();
                })
                    .catch(noop);
                /**
                 * This forces Webkit to run animations on the main thread by exploiting
                 * this condition:
                 * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/platform/graphics/ca/GraphicsLayerCA.cpp?rev=281238#L1099
                 *
                 * This fixes Webkit's timing bugs, like accelerated animations falling
                 * out of sync with main thread animations and massive delays in starting
                 * accelerated animations in WKWebView.
                 */
                if (!allowWebkitAcceleration)
                    animation.playbackRate = 1.000001;
                /**
                 * If we can't animate the value natively then we can fallback to the numbers-only
                 * polyfill for transforms.
                 */
            }
            else if (AnimationPolyfill && valueIsTransform) {
                /**
                 * If any keyframe is a string (because we measured it from the DOM), we need to convert
                 * it into a number before passing to the Animation polyfill.
                 */
                keyframes = keyframes.map((value) => typeof value === "string" ? parseFloat(value) : value);
                /**
                 * If we only have a single keyframe, we need to create an initial keyframe by reading
                 * the current value from the DOM.
                 */
                if (keyframes.length === 1) {
                    keyframes.unshift(parseFloat(readInitialValue()));
                }
                animation = new AnimationPolyfill((latest) => {
                    style.set(element, name, toUnit ? toUnit(latest) : latest);
                }, keyframes, Object.assign(Object.assign({}, options), { duration,
                    easing }));
            }
            else {
                const target = keyframes[keyframes.length - 1];
                style.set(element, name, definition && isNumber(target)
                    ? definition.toDefaultUnit(target)
                    : target);
            }
            if (isRecording) {
                record(element, key, keyframes, {
                    duration,
                    delay: delay,
                    easing,
                    repeat,
                    offset,
                }, "motion-one");
            }
            motionValue.setAnimation(animation);
            return animation;
        };
    }

    const getOptions = (options, key) => 
    /**
     * TODO: Make test for this
     * Always return a new object otherwise delay is overwritten by results of stagger
     * and this results in no stagger
     */
    options[key] ? Object.assign(Object.assign({}, options), options[key]) : Object.assign({}, options);

    function resolveElements(elements, selectorCache) {
        var _a;
        if (typeof elements === "string") {
            if (selectorCache) {
                (_a = selectorCache[elements]) !== null && _a !== void 0 ? _a : (selectorCache[elements] = document.querySelectorAll(elements));
                elements = selectorCache[elements];
            }
            else {
                elements = document.querySelectorAll(elements);
            }
        }
        else if (elements instanceof Element) {
            elements = [elements];
        }
        /**
         * Return an empty array
         */
        return Array.from(elements || []);
    }

    const createAnimation = (factory) => factory();
    const withControls = (animationFactory, options, duration = defaults.duration) => {
        return new Proxy({
            animations: animationFactory.map(createAnimation).filter(Boolean),
            duration,
            options,
        }, controls);
    };
    /**
     * TODO:
     * Currently this returns the first animation, ideally it would return
     * the first active animation.
     */
    const getActiveAnimation = (state) => state.animations[0];
    const controls = {
        get: (target, key) => {
            const activeAnimation = getActiveAnimation(target);
            switch (key) {
                case "duration":
                    return target.duration;
                case "currentTime":
                    return time.s((activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key]) || 0);
                case "playbackRate":
                case "playState":
                    return activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key];
                case "finished":
                    if (!target.finished) {
                        target.finished = Promise.all(target.animations.map(selectFinished)).catch(noop);
                    }
                    return target.finished;
                case "stop":
                    return () => {
                        target.animations.forEach((animation) => stopAnimation(animation));
                    };
                case "forEachNative":
                    /**
                     * This is for internal use only, fire a callback for each
                     * underlying animation.
                     */
                    return (callback) => {
                        target.animations.forEach((animation) => callback(animation, target));
                    };
                default:
                    return typeof (activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key]) === "undefined"
                        ? undefined
                        : () => target.animations.forEach((animation) => animation[key]());
            }
        },
        set: (target, key, value) => {
            switch (key) {
                case "currentTime":
                    value = time.ms(value);
                // Fall-through
                case "playbackRate":
                    for (let i = 0; i < target.animations.length; i++) {
                        target.animations[i][key] = value;
                    }
                    return true;
            }
            return false;
        },
    };
    const selectFinished = (animation) => animation.finished;

    function stagger(duration = 0.1, { start = 0, from = 0, easing } = {}) {
        return (i, total) => {
            const fromIndex = isNumber(from) ? from : getFromIndex(from, total);
            const distance = Math.abs(fromIndex - i);
            let delay = duration * distance;
            if (easing) {
                const maxDelay = total * duration;
                const easingFunction = getEasingFunction(easing);
                delay = easingFunction(delay / maxDelay) * maxDelay;
            }
            return start + delay;
        };
    }
    function getFromIndex(from, total) {
        if (from === "first") {
            return 0;
        }
        else {
            const lastIndex = total - 1;
            return from === "last" ? lastIndex : lastIndex / 2;
        }
    }
    function resolveOption(option, i, total) {
        return isFunction(option) ? option(i, total) : option;
    }

    function createAnimate(AnimatePolyfill) {
        return function animate(elements, keyframes, options = {}) {
            elements = resolveElements(elements);
            const numElements = elements.length;
            invariant(Boolean(numElements), "No valid element provided.");
            invariant(Boolean(keyframes), "No keyframes defined.");
            /**
             * Create and start new animations
             */
            const animationFactories = [];
            for (let i = 0; i < numElements; i++) {
                const element = elements[i];
                for (const key in keyframes) {
                    const valueOptions = getOptions(options, key);
                    valueOptions.delay = resolveOption(valueOptions.delay, i, numElements);
                    const animation = animateStyle(element, key, keyframes[key], valueOptions, AnimatePolyfill);
                    animationFactories.push(animation);
                }
            }
            return withControls(animationFactories, options, 
            /**
             * TODO:
             * If easing is set to spring or glide, duration will be dynamically
             * generated. Ideally we would dynamically generate this from
             * animation.effect.getComputedTiming().duration but this isn't
             * supported in iOS13 or our number polyfill. Perhaps it's possible
             * to Proxy animations returned from animateStyle that has duration
             * as a getter.
             */
            options.duration);
        };
    }

    const animate$1 = createAnimate(Animation);

    function animateProgress(target, options = {}) {
        return withControls([
            () => {
                const animation = new Animation(target, [0, 1], options);
                animation.finished.catch(() => { });
                return animation;
            },
        ], options, options.duration);
    }
    function animate(target, keyframesOrOptions, options) {
        const factory = isFunction(target) ? animateProgress : animate$1;
        return factory(target, keyframesOrOptions, options);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
     */

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const stringToByteArray$1 = function (str) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let p = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    const byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let pos = 0, c = 0;
        while (pos < bytes.length) {
            const c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                const c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                const c4 = bytes[pos++];
                const u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    const base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray(input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            const byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            const output = [];
            for (let i = 0; i < input.length; i += 3) {
                const byte1 = input[i];
                const haveByte2 = i + 1 < input.length;
                const byte2 = haveByte2 ? input[i + 1] : 0;
                const haveByte3 = i + 2 < input.length;
                const byte3 = haveByte3 ? input[i + 2] : 0;
                const outByte1 = byte1 >> 2;
                const outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                let outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                let outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray$1(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray(input, webSafe) {
            this.init_();
            const charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            const output = [];
            for (let i = 0; i < input.length;) {
                const byte1 = charToByteMap[input.charAt(i++)];
                const haveByte2 = i < input.length;
                const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                const haveByte3 = i < input.length;
                const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                const haveByte4 = i < input.length;
                const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw new DecodeBase64StringError();
                }
                const outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    const outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        const outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_() {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (let i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * An error encountered while decoding base64 string.
     */
    class DecodeBase64StringError extends Error {
        constructor() {
            super(...arguments);
            this.name = 'DecodeBase64StringError';
        }
    }
    /**
     * URL-safe base64 encoding
     */
    const base64Encode = function (str) {
        const utf8Bytes = stringToByteArray$1(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 encoding (without "." padding in the end).
     * e.g. Used in JSON Web Token (JWT) parts.
     */
    const base64urlEncodeWithoutPadding = function (str) {
        // Use base64url encoding and remove padding in the end (dot characters).
        return base64Encode(str).replace(/\./g, '');
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    const base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Polyfill for `globalThis` object.
     * @returns the `globalThis` object for the given environment.
     * @public
     */
    function getGlobal() {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('Unable to locate global object.');
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
    /**
     * Attempt to read defaults from a JSON string provided to
     * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
     * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
     * The dots are in parens because certain compilers (Vite?) cannot
     * handle seeing that variable in comments.
     * See https://github.com/firebase/firebase-js-sdk/issues/6838
     */
    const getDefaultsFromEnvVariable = () => {
        if (typeof process === 'undefined' || typeof process.env === 'undefined') {
            return;
        }
        const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
        if (defaultsJsonString) {
            return JSON.parse(defaultsJsonString);
        }
    };
    const getDefaultsFromCookie = () => {
        if (typeof document === 'undefined') {
            return;
        }
        let match;
        try {
            match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        }
        catch (e) {
            // Some environments such as Angular Universal SSR have a
            // `document` object but error on accessing `document.cookie`.
            return;
        }
        const decoded = match && base64Decode(match[1]);
        return decoded && JSON.parse(decoded);
    };
    /**
     * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
     * (1) if such an object exists as a property of `globalThis`
     * (2) if such an object was provided on a shell environment variable
     * (3) if such an object exists in a cookie
     * @public
     */
    const getDefaults = () => {
        try {
            return (getDefaultsFromGlobal() ||
                getDefaultsFromEnvVariable() ||
                getDefaultsFromCookie());
        }
        catch (e) {
            /**
             * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
             * to any environment case we have not accounted for. Log to
             * info instead of swallowing so we can find these unknown cases
             * and add paths for them if needed.
             */
            console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
            return;
        }
    };
    /**
     * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
     * for the given product.
     * @returns a URL host formatted like `127.0.0.1:9999` or `[::1]:4000` if available
     * @public
     */
    const getDefaultEmulatorHost = (productName) => { var _a, _b; return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName]; };
    /**
     * Returns emulator hostname and port stored in the __FIREBASE_DEFAULTS__ object
     * for the given product.
     * @returns a pair of hostname and port like `["::1", 4000]` if available
     * @public
     */
    const getDefaultEmulatorHostnameAndPort = (productName) => {
        const host = getDefaultEmulatorHost(productName);
        if (!host) {
            return undefined;
        }
        const separatorIndex = host.lastIndexOf(':'); // Finding the last since IPv6 addr also has colons.
        if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
            throw new Error(`Invalid host ${host} with no separate hostname and port!`);
        }
        // eslint-disable-next-line no-restricted-globals
        const port = parseInt(host.substring(separatorIndex + 1), 10);
        if (host[0] === '[') {
            // Bracket-quoted `[ipv6addr]:port` => return "ipv6addr" (without brackets).
            return [host.substring(1, separatorIndex - 1), port];
        }
        else {
            return [host.substring(0, separatorIndex), port];
        }
    };
    /**
     * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
     * @public
     */
    const getDefaultAppConfig = () => { var _a; return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config; };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class Deferred {
        constructor() {
            this.reject = () => { };
            this.resolve = () => { };
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
        /**
         * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        wrapCallback(callback) {
            return (error, value) => {
                if (error) {
                    this.reject(error);
                }
                else {
                    this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    this.promise.catch(() => { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        }
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function createMockUserToken(token, projectId) {
        if (token.uid) {
            throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
        }
        // Unsecured JWTs use "none" as the algorithm.
        const header = {
            alg: 'none',
            type: 'JWT'
        };
        const project = projectId || 'demo-project';
        const iat = token.iat || 0;
        const sub = token.sub || token.user_id;
        if (!sub) {
            throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
        }
        const payload = Object.assign({ 
            // Set all required fields to decent defaults
            iss: `https://securetoken.google.com/${project}`, aud: project, iat, exp: iat + 3600, auth_time: iat, sub, user_id: sub, firebase: {
                sign_in_provider: 'custom',
                identities: {}
            } }, token);
        // Unsecured JWTs use the empty string as a signature.
        const signature = '';
        return [
            base64urlEncodeWithoutPadding(JSON.stringify(header)),
            base64urlEncodeWithoutPadding(JSON.stringify(payload)),
            signature
        ].join('.');
    }
    /**
     * This method checks if indexedDB is supported by current browser/service worker context
     * @return true if indexedDB is supported by current browser/service worker context
     */
    function isIndexedDBAvailable() {
        try {
            return typeof indexedDB === 'object';
        }
        catch (e) {
            return false;
        }
    }
    /**
     * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
     * if errors occur during the database open operation.
     *
     * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
     * private browsing)
     */
    function validateIndexedDBOpenable() {
        return new Promise((resolve, reject) => {
            try {
                let preExist = true;
                const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
                const request = self.indexedDB.open(DB_CHECK_NAME);
                request.onsuccess = () => {
                    request.result.close();
                    // delete database only when it doesn't pre-exist
                    if (!preExist) {
                        self.indexedDB.deleteDatabase(DB_CHECK_NAME);
                    }
                    resolve(true);
                };
                request.onupgradeneeded = () => {
                    preExist = false;
                };
                request.onerror = () => {
                    var _a;
                    reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || '');
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Standardized Firebase Error.
     *
     * Usage:
     *
     *   // Typescript string literals for type-safe codes
     *   type Err =
     *     'unknown' |
     *     'object-not-found'
     *     ;
     *
     *   // Closure enum for type-safe error codes
     *   // at-enum {string}
     *   var Err = {
     *     UNKNOWN: 'unknown',
     *     OBJECT_NOT_FOUND: 'object-not-found',
     *   }
     *
     *   let errors: Map<Err, string> = {
     *     'generic-error': "Unknown error",
     *     'file-not-found': "Could not find file: {$file}",
     *   };
     *
     *   // Type-safe function - must pass a valid error code as param.
     *   let error = new ErrorFactory<Err>('service', 'Service', errors);
     *
     *   ...
     *   throw error.create(Err.GENERIC);
     *   ...
     *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
     *   ...
     *   // Service: Could not file file: foo.txt (service/file-not-found).
     *
     *   catch (e) {
     *     assert(e.message === "Could not find file: foo.txt.");
     *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
     *       console.log("Could not read file: " + e['file']);
     *     }
     *   }
     */
    const ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    class FirebaseError extends Error {
        constructor(
        /** The error code for this error. */
        code, message, 
        /** Custom data for this error. */
        customData) {
            super(message);
            this.code = code;
            this.customData = customData;
            /** The custom name for all FirebaseErrors. */
            this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            Object.setPrototypeOf(this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, ErrorFactory.prototype.create);
            }
        }
    }
    class ErrorFactory {
        constructor(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        create(code, ...data) {
            const customData = data[0] || {};
            const fullCode = `${this.service}/${code}`;
            const template = this.errors[code];
            const message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
            const error = new FirebaseError(fullCode, fullMessage, customData);
            return error;
        }
    }
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, (_, key) => {
            const value = data[key];
            return value != null ? String(value) : `<${key}?>`;
        });
    }
    const PATTERN = /\{\$([^}]+)}/g;
    /**
     * Deep equal two objects. Support Arrays and Objects.
     */
    function deepEqual(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        for (const k of aKeys) {
            if (!bKeys.includes(k)) {
                return false;
            }
            const aProp = a[k];
            const bProp = b[k];
            if (isObject(aProp) && isObject(bProp)) {
                if (!deepEqual(aProp, bProp)) {
                    return false;
                }
            }
            else if (aProp !== bProp) {
                return false;
            }
        }
        for (const k of bKeys) {
            if (!aKeys.includes(k)) {
                return false;
            }
        }
        return true;
    }
    function isObject(thing) {
        return thing !== null && typeof thing === 'object';
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getModularInstance(service) {
        if (service && service._delegate) {
            return service._delegate;
        }
        else {
            return service;
        }
    }

    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    class Component {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        constructor(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
            this.onInstanceCreated = null;
        }
        setInstantiationMode(mode) {
            this.instantiationMode = mode;
            return this;
        }
        setMultipleInstances(multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        }
        setServiceProps(props) {
            this.serviceProps = props;
            return this;
        }
        setInstanceCreatedCallback(callback) {
            this.onInstanceCreated = callback;
            return this;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    class Provider {
        constructor(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
            this.instancesOptions = new Map();
            this.onInitCallbacks = new Map();
        }
        /**
         * @param identifier A provider can provide mulitple instances of a service
         * if this.component.multipleInstances is true.
         */
        get(identifier) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                const deferred = new Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                if (this.isInitialized(normalizedIdentifier) ||
                    this.shouldAutoInitialize()) {
                    // initialize the service if it can be auto-initialized
                    try {
                        const instance = this.getOrInitializeService({
                            instanceIdentifier: normalizedIdentifier
                        });
                        if (instance) {
                            deferred.resolve(instance);
                        }
                    }
                    catch (e) {
                        // when the instance factory throws an exception during get(), it should not cause
                        // a fatal error. We just return the unresolved promise in this case.
                    }
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        }
        getImmediate(options) {
            var _a;
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
            const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
            if (this.isInitialized(normalizedIdentifier) ||
                this.shouldAutoInitialize()) {
                try {
                    return this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                }
                catch (e) {
                    if (optional) {
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                // In case a component is not initialized and should/can not be auto-initialized at the moment, return null if the optional flag is set, or throw
                if (optional) {
                    return null;
                }
                else {
                    throw Error(`Service ${this.name} is not available`);
                }
            }
        }
        getComponent() {
            return this.component;
        }
        setComponent(component) {
            if (component.name !== this.name) {
                throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
            }
            if (this.component) {
                throw Error(`Component for ${this.name} has already been provided`);
            }
            this.component = component;
            // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
            if (!this.shouldAutoInitialize()) {
                return;
            }
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            // Create service instances for the pending promises and resolve them
            // NOTE: if this.multipleInstances is false, only the default instance will be created
            // and all promises with resolve with it regardless of the identifier.
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                try {
                    // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                    const instance = this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                    instanceDeferred.resolve(instance);
                }
                catch (e) {
                    // when the instance factory throws an exception, it should not cause
                    // a fatal error. We just leave the promise unresolved.
                }
            }
        }
        clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
            this.instancesDeferred.delete(identifier);
            this.instancesOptions.delete(identifier);
            this.instances.delete(identifier);
        }
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        async delete() {
            const services = Array.from(this.instances.values());
            await Promise.all([
                ...services
                    .filter(service => 'INTERNAL' in service) // legacy services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service.INTERNAL.delete()),
                ...services
                    .filter(service => '_delete' in service) // modularized services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service._delete())
            ]);
        }
        isComponentSet() {
            return this.component != null;
        }
        isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instances.has(identifier);
        }
        getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instancesOptions.get(identifier) || {};
        }
        initialize(opts = {}) {
            const { options = {} } = opts;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
            if (this.isInitialized(normalizedIdentifier)) {
                throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
            }
            if (!this.isComponentSet()) {
                throw Error(`Component ${this.name} has not been registered yet`);
            }
            const instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier,
                options
            });
            // resolve any pending promise waiting for the service instance
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                if (normalizedIdentifier === normalizedDeferredIdentifier) {
                    instanceDeferred.resolve(instance);
                }
            }
            return instance;
        }
        /**
         *
         * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
         * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
         *
         * @param identifier An optional instance identifier
         * @returns a function to unregister the callback
         */
        onInit(callback, identifier) {
            var _a;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
            existingCallbacks.add(callback);
            this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
            const existingInstance = this.instances.get(normalizedIdentifier);
            if (existingInstance) {
                callback(existingInstance, normalizedIdentifier);
            }
            return () => {
                existingCallbacks.delete(callback);
            };
        }
        /**
         * Invoke onInit callbacks synchronously
         * @param instance the service instance`
         */
        invokeOnInitCallbacks(instance, identifier) {
            const callbacks = this.onInitCallbacks.get(identifier);
            if (!callbacks) {
                return;
            }
            for (const callback of callbacks) {
                try {
                    callback(instance, identifier);
                }
                catch (_a) {
                    // ignore errors in the onInit callback
                }
            }
        }
        getOrInitializeService({ instanceIdentifier, options = {} }) {
            let instance = this.instances.get(instanceIdentifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, {
                    instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
                    options
                });
                this.instances.set(instanceIdentifier, instance);
                this.instancesOptions.set(instanceIdentifier, options);
                /**
                 * Invoke onInit listeners.
                 * Note this.component.onInstanceCreated is different, which is used by the component creator,
                 * while onInit listeners are registered by consumers of the provider.
                 */
                this.invokeOnInitCallbacks(instance, instanceIdentifier);
                /**
                 * Order is important
                 * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
                 * makes `isInitialized()` return true.
                 */
                if (this.component.onInstanceCreated) {
                    try {
                        this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
                    }
                    catch (_a) {
                        // ignore errors in the onInstanceCreatedCallback
                    }
                }
            }
            return instance || null;
        }
        normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        }
        shouldAutoInitialize() {
            return (!!this.component &&
                this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */);
        }
    }
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    class ComponentContainer {
        constructor(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        addComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
            }
            provider.setComponent(component);
        }
        addOrOverwriteComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        }
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        getProvider(name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            const provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        }
        getProviders() {
            return Array.from(this.providers.values());
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A container for all of the Logger instances
     */
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    const levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    const defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    const ConsoleMethod = {
        [LogLevel.DEBUG]: 'log',
        [LogLevel.VERBOSE]: 'log',
        [LogLevel.INFO]: 'info',
        [LogLevel.WARN]: 'warn',
        [LogLevel.ERROR]: 'error'
    };
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    const defaultLogHandler = (instance, logType, ...args) => {
        if (logType < instance.logLevel) {
            return;
        }
        const now = new Date().toISOString();
        const method = ConsoleMethod[logType];
        if (method) {
            console[method](`[${now}]  ${instance.name}:`, ...args);
        }
        else {
            throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
        }
    };
    class Logger {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        constructor(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
        }
        get logLevel() {
            return this._logLevel;
        }
        set logLevel(val) {
            if (!(val in LogLevel)) {
                throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
            }
            this._logLevel = val;
        }
        // Workaround for setter/getter having to be the same type.
        setLogLevel(val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        }
        get logHandler() {
            return this._logHandler;
        }
        set logHandler(val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        }
        get userLogHandler() {
            return this._userLogHandler;
        }
        set userLogHandler(val) {
            this._userLogHandler = val;
        }
        /**
         * The functions below are all based on the `console` interface
         */
        debug(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
            this._logHandler(this, LogLevel.DEBUG, ...args);
        }
        log(...args) {
            this._userLogHandler &&
                this._userLogHandler(this, LogLevel.VERBOSE, ...args);
            this._logHandler(this, LogLevel.VERBOSE, ...args);
        }
        info(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
            this._logHandler(this, LogLevel.INFO, ...args);
        }
        warn(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
            this._logHandler(this, LogLevel.WARN, ...args);
        }
        error(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
            this._logHandler(this, LogLevel.ERROR, ...args);
        }
    }

    const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

    let idbProxyableTypes;
    let cursorAdvanceMethods;
    // This is a function to prevent it throwing up in node environments.
    function getIdbProxyableTypes() {
        return (idbProxyableTypes ||
            (idbProxyableTypes = [
                IDBDatabase,
                IDBObjectStore,
                IDBIndex,
                IDBCursor,
                IDBTransaction,
            ]));
    }
    // This is a function to prevent it throwing up in node environments.
    function getCursorAdvanceMethods() {
        return (cursorAdvanceMethods ||
            (cursorAdvanceMethods = [
                IDBCursor.prototype.advance,
                IDBCursor.prototype.continue,
                IDBCursor.prototype.continuePrimaryKey,
            ]));
    }
    const cursorRequestMap = new WeakMap();
    const transactionDoneMap = new WeakMap();
    const transactionStoreNamesMap = new WeakMap();
    const transformCache = new WeakMap();
    const reverseTransformCache = new WeakMap();
    function promisifyRequest(request) {
        const promise = new Promise((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener('success', success);
                request.removeEventListener('error', error);
            };
            const success = () => {
                resolve(wrap(request.result));
                unlisten();
            };
            const error = () => {
                reject(request.error);
                unlisten();
            };
            request.addEventListener('success', success);
            request.addEventListener('error', error);
        });
        promise
            .then((value) => {
            // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
            // (see wrapFunction).
            if (value instanceof IDBCursor) {
                cursorRequestMap.set(value, request);
            }
            // Catching to avoid "Uncaught Promise exceptions"
        })
            .catch(() => { });
        // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
        // is because we create many promises from a single IDBRequest.
        reverseTransformCache.set(promise, request);
        return promise;
    }
    function cacheDonePromiseForTransaction(tx) {
        // Early bail if we've already created a done promise for this transaction.
        if (transactionDoneMap.has(tx))
            return;
        const done = new Promise((resolve, reject) => {
            const unlisten = () => {
                tx.removeEventListener('complete', complete);
                tx.removeEventListener('error', error);
                tx.removeEventListener('abort', error);
            };
            const complete = () => {
                resolve();
                unlisten();
            };
            const error = () => {
                reject(tx.error || new DOMException('AbortError', 'AbortError'));
                unlisten();
            };
            tx.addEventListener('complete', complete);
            tx.addEventListener('error', error);
            tx.addEventListener('abort', error);
        });
        // Cache it for later retrieval.
        transactionDoneMap.set(tx, done);
    }
    let idbProxyTraps = {
        get(target, prop, receiver) {
            if (target instanceof IDBTransaction) {
                // Special handling for transaction.done.
                if (prop === 'done')
                    return transactionDoneMap.get(target);
                // Polyfill for objectStoreNames because of Edge.
                if (prop === 'objectStoreNames') {
                    return target.objectStoreNames || transactionStoreNamesMap.get(target);
                }
                // Make tx.store return the only store in the transaction, or undefined if there are many.
                if (prop === 'store') {
                    return receiver.objectStoreNames[1]
                        ? undefined
                        : receiver.objectStore(receiver.objectStoreNames[0]);
                }
            }
            // Else transform whatever we get back.
            return wrap(target[prop]);
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            if (target instanceof IDBTransaction &&
                (prop === 'done' || prop === 'store')) {
                return true;
            }
            return prop in target;
        },
    };
    function replaceTraps(callback) {
        idbProxyTraps = callback(idbProxyTraps);
    }
    function wrapFunction(func) {
        // Due to expected object equality (which is enforced by the caching in `wrap`), we
        // only create one new func per func.
        // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
        if (func === IDBDatabase.prototype.transaction &&
            !('objectStoreNames' in IDBTransaction.prototype)) {
            return function (storeNames, ...args) {
                const tx = func.call(unwrap(this), storeNames, ...args);
                transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
                return wrap(tx);
            };
        }
        // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
        // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
        // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
        // with real promises, so each advance methods returns a new promise for the cursor object, or
        // undefined if the end of the cursor has been reached.
        if (getCursorAdvanceMethods().includes(func)) {
            return function (...args) {
                // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
                // the original object.
                func.apply(unwrap(this), args);
                return wrap(cursorRequestMap.get(this));
            };
        }
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            return wrap(func.apply(unwrap(this), args));
        };
    }
    function transformCachableValue(value) {
        if (typeof value === 'function')
            return wrapFunction(value);
        // This doesn't return, it just creates a 'done' promise for the transaction,
        // which is later returned for transaction.done (see idbObjectHandler).
        if (value instanceof IDBTransaction)
            cacheDonePromiseForTransaction(value);
        if (instanceOfAny(value, getIdbProxyableTypes()))
            return new Proxy(value, idbProxyTraps);
        // Return the same value back if we're not going to transform it.
        return value;
    }
    function wrap(value) {
        // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
        // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
        if (value instanceof IDBRequest)
            return promisifyRequest(value);
        // If we've already transformed this value before, reuse the transformed value.
        // This is faster, but it also provides object equality.
        if (transformCache.has(value))
            return transformCache.get(value);
        const newValue = transformCachableValue(value);
        // Not all types are transformed.
        // These may be primitive types, so they can't be WeakMap keys.
        if (newValue !== value) {
            transformCache.set(value, newValue);
            reverseTransformCache.set(newValue, value);
        }
        return newValue;
    }
    const unwrap = (value) => reverseTransformCache.get(value);

    /**
     * Open a database.
     *
     * @param name Name of the database.
     * @param version Schema version.
     * @param callbacks Additional callbacks.
     */
    function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
        const request = indexedDB.open(name, version);
        const openPromise = wrap(request);
        if (upgrade) {
            request.addEventListener('upgradeneeded', (event) => {
                upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
            });
        }
        if (blocked) {
            request.addEventListener('blocked', (event) => blocked(
            // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
            event.oldVersion, event.newVersion, event));
        }
        openPromise
            .then((db) => {
            if (terminated)
                db.addEventListener('close', () => terminated());
            if (blocking) {
                db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
            }
        })
            .catch(() => { });
        return openPromise;
    }

    const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
    const writeMethods = ['put', 'add', 'delete', 'clear'];
    const cachedMethods = new Map();
    function getMethod(target, prop) {
        if (!(target instanceof IDBDatabase &&
            !(prop in target) &&
            typeof prop === 'string')) {
            return;
        }
        if (cachedMethods.get(prop))
            return cachedMethods.get(prop);
        const targetFuncName = prop.replace(/FromIndex$/, '');
        const useIndex = prop !== targetFuncName;
        const isWrite = writeMethods.includes(targetFuncName);
        if (
        // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
        !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
            !(isWrite || readMethods.includes(targetFuncName))) {
            return;
        }
        const method = async function (storeName, ...args) {
            // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
            const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
            let target = tx.store;
            if (useIndex)
                target = target.index(args.shift());
            // Must reject if op rejects.
            // If it's a write operation, must reject if tx.done rejects.
            // Must reject with op rejection first.
            // Must resolve with op value.
            // Must handle both promises (no unhandled rejections)
            return (await Promise.all([
                target[targetFuncName](...args),
                isWrite && tx.done,
            ]))[0];
        };
        cachedMethods.set(prop, method);
        return method;
    }
    replaceTraps((oldTraps) => ({
        ...oldTraps,
        get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
        has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
    }));

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class PlatformLoggerServiceImpl {
        constructor(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        getPlatformInfoString() {
            const providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(provider => {
                if (isVersionServiceProvider(provider)) {
                    const service = provider.getImmediate();
                    return `${service.library}/${service.version}`;
                }
                else {
                    return null;
                }
            })
                .filter(logString => logString)
                .join(' ');
        }
    }
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        const component = provider.getComponent();
        return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* ComponentType.VERSION */;
    }

    const name$o = "@firebase/app";
    const version$1 = "0.9.20";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logger = new Logger('@firebase/app');

    const name$n = "@firebase/app-compat";

    const name$m = "@firebase/analytics-compat";

    const name$l = "@firebase/analytics";

    const name$k = "@firebase/app-check-compat";

    const name$j = "@firebase/app-check";

    const name$i = "@firebase/auth";

    const name$h = "@firebase/auth-compat";

    const name$g = "@firebase/database";

    const name$f = "@firebase/database-compat";

    const name$e = "@firebase/functions";

    const name$d = "@firebase/functions-compat";

    const name$c = "@firebase/installations";

    const name$b = "@firebase/installations-compat";

    const name$a = "@firebase/messaging";

    const name$9 = "@firebase/messaging-compat";

    const name$8 = "@firebase/performance";

    const name$7 = "@firebase/performance-compat";

    const name$6 = "@firebase/remote-config";

    const name$5 = "@firebase/remote-config-compat";

    const name$4 = "@firebase/storage";

    const name$3 = "@firebase/storage-compat";

    const name$2 = "@firebase/firestore";

    const name$1 = "@firebase/firestore-compat";

    const name$p = "firebase";
    const version$2 = "10.5.0";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The default app name
     *
     * @internal
     */
    const DEFAULT_ENTRY_NAME = '[DEFAULT]';
    const PLATFORM_LOG_STRING = {
        [name$o]: 'fire-core',
        [name$n]: 'fire-core-compat',
        [name$l]: 'fire-analytics',
        [name$m]: 'fire-analytics-compat',
        [name$j]: 'fire-app-check',
        [name$k]: 'fire-app-check-compat',
        [name$i]: 'fire-auth',
        [name$h]: 'fire-auth-compat',
        [name$g]: 'fire-rtdb',
        [name$f]: 'fire-rtdb-compat',
        [name$e]: 'fire-fn',
        [name$d]: 'fire-fn-compat',
        [name$c]: 'fire-iid',
        [name$b]: 'fire-iid-compat',
        [name$a]: 'fire-fcm',
        [name$9]: 'fire-fcm-compat',
        [name$8]: 'fire-perf',
        [name$7]: 'fire-perf-compat',
        [name$6]: 'fire-rc',
        [name$5]: 'fire-rc-compat',
        [name$4]: 'fire-gcs',
        [name$3]: 'fire-gcs-compat',
        [name$2]: 'fire-fst',
        [name$1]: 'fire-fst-compat',
        'fire-js': 'fire-js',
        [name$p]: 'fire-js-all'
    };

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */
    const _apps = new Map();
    /**
     * Registered components.
     *
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _components = new Map();
    /**
     * @param component - the component being added to this app's container
     *
     * @internal
     */
    function _addComponent(app, component) {
        try {
            app.container.addComponent(component);
        }
        catch (e) {
            logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
        }
    }
    /**
     *
     * @param component - the component to register
     * @returns whether or not the component is registered successfully
     *
     * @internal
     */
    function _registerComponent(component) {
        const componentName = component.name;
        if (_components.has(componentName)) {
            logger.debug(`There were multiple attempts to register component ${componentName}.`);
            return false;
        }
        _components.set(componentName, component);
        // add the component to existing app instances
        for (const app of _apps.values()) {
            _addComponent(app, component);
        }
        return true;
    }
    /**
     *
     * @param app - FirebaseApp instance
     * @param name - service name
     *
     * @returns the provider for the service with the matching name
     *
     * @internal
     */
    function _getProvider(app, name) {
        const heartbeatController = app.container
            .getProvider('heartbeat')
            .getImmediate({ optional: true });
        if (heartbeatController) {
            void heartbeatController.triggerHeartbeat();
        }
        return app.container.getProvider(name);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERRORS = {
        ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " +
            'call initializeApp() first',
        ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}",
        ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different options or config",
        ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
        ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
        ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
        ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.'
    };
    const ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FirebaseAppImpl {
        constructor(options, config, container) {
            this._isDeleted = false;
            this._options = Object.assign({}, options);
            this._config = Object.assign({}, config);
            this._name = config.name;
            this._automaticDataCollectionEnabled =
                config.automaticDataCollectionEnabled;
            this._container = container;
            this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
        }
        get automaticDataCollectionEnabled() {
            this.checkDestroyed();
            return this._automaticDataCollectionEnabled;
        }
        set automaticDataCollectionEnabled(val) {
            this.checkDestroyed();
            this._automaticDataCollectionEnabled = val;
        }
        get name() {
            this.checkDestroyed();
            return this._name;
        }
        get options() {
            this.checkDestroyed();
            return this._options;
        }
        get config() {
            this.checkDestroyed();
            return this._config;
        }
        get container() {
            return this._container;
        }
        get isDeleted() {
            return this._isDeleted;
        }
        set isDeleted(val) {
            this._isDeleted = val;
        }
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        checkDestroyed() {
            if (this.isDeleted) {
                throw ERROR_FACTORY.create("app-deleted" /* AppError.APP_DELETED */, { appName: this._name });
            }
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The current SDK version.
     *
     * @public
     */
    const SDK_VERSION = version$2;
    function initializeApp(_options, rawConfig = {}) {
        let options = _options;
        if (typeof rawConfig !== 'object') {
            const name = rawConfig;
            rawConfig = { name };
        }
        const config = Object.assign({ name: DEFAULT_ENTRY_NAME, automaticDataCollectionEnabled: false }, rawConfig);
        const name = config.name;
        if (typeof name !== 'string' || !name) {
            throw ERROR_FACTORY.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
                appName: String(name)
            });
        }
        options || (options = getDefaultAppConfig());
        if (!options) {
            throw ERROR_FACTORY.create("no-options" /* AppError.NO_OPTIONS */);
        }
        const existingApp = _apps.get(name);
        if (existingApp) {
            // return the existing app if options and config deep equal the ones in the existing app.
            if (deepEqual(options, existingApp.options) &&
                deepEqual(config, existingApp.config)) {
                return existingApp;
            }
            else {
                throw ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: name });
            }
        }
        const container = new ComponentContainer(name);
        for (const component of _components.values()) {
            container.addComponent(component);
        }
        const newApp = new FirebaseAppImpl(options, config, container);
        _apps.set(name, newApp);
        return newApp;
    }
    /**
     * Retrieves a {@link @firebase/app#FirebaseApp} instance.
     *
     * When called with no arguments, the default app is returned. When an app name
     * is provided, the app corresponding to that name is returned.
     *
     * An exception is thrown if the app being retrieved has not yet been
     * initialized.
     *
     * @example
     * ```javascript
     * // Return the default app
     * const app = getApp();
     * ```
     *
     * @example
     * ```javascript
     * // Return a named app
     * const otherApp = getApp("otherApp");
     * ```
     *
     * @param name - Optional name of the app to return. If no name is
     *   provided, the default is `"[DEFAULT]"`.
     *
     * @returns The app corresponding to the provided app name.
     *   If no app name is provided, the default app is returned.
     *
     * @public
     */
    function getApp(name = DEFAULT_ENTRY_NAME) {
        const app = _apps.get(name);
        if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
            return initializeApp();
        }
        if (!app) {
            throw ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: name });
        }
        return app;
    }
    /**
     * Registers a library's name and version for platform logging purposes.
     * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
     * @param version - Current version of that library.
     * @param variant - Bundle variant, e.g., node, rn, etc.
     *
     * @public
     */
    function registerVersion(libraryKeyOrName, version, variant) {
        var _a;
        // TODO: We can use this check to whitelist strings when/if we set up
        // a good whitelist system.
        let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
        if (variant) {
            library += `-${variant}`;
        }
        const libraryMismatch = library.match(/\s|\//);
        const versionMismatch = version.match(/\s|\//);
        if (libraryMismatch || versionMismatch) {
            const warning = [
                `Unable to register library "${library}" with version "${version}":`
            ];
            if (libraryMismatch) {
                warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
            }
            if (libraryMismatch && versionMismatch) {
                warning.push('and');
            }
            if (versionMismatch) {
                warning.push(`version name "${version}" contains illegal characters (whitespace or "/")`);
            }
            logger.warn(warning.join(' '));
            return;
        }
        _registerComponent(new Component(`${library}-version`, () => ({ library, version }), "VERSION" /* ComponentType.VERSION */));
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME = 'firebase-heartbeat-database';
    const DB_VERSION = 1;
    const STORE_NAME = 'firebase-heartbeat-store';
    let dbPromise = null;
    function getDbPromise() {
        if (!dbPromise) {
            dbPromise = openDB(DB_NAME, DB_VERSION, {
                upgrade: (db, oldVersion) => {
                    // We don't use 'break' in this switch statement, the fall-through
                    // behavior is what we want, because if there are multiple versions between
                    // the old version and the current version, we want ALL the migrations
                    // that correspond to those versions to run, not only the last one.
                    // eslint-disable-next-line default-case
                    switch (oldVersion) {
                        case 0:
                            db.createObjectStore(STORE_NAME);
                    }
                }
            }).catch(e => {
                throw ERROR_FACTORY.create("idb-open" /* AppError.IDB_OPEN */, {
                    originalErrorMessage: e.message
                });
            });
        }
        return dbPromise;
    }
    async function readHeartbeatsFromIndexedDB(app) {
        try {
            const db = await getDbPromise();
            const result = await db
                .transaction(STORE_NAME)
                .objectStore(STORE_NAME)
                .get(computeKey(app));
            return result;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-get" /* AppError.IDB_GET */, {
                    originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
        try {
            const db = await getDbPromise();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const objectStore = tx.objectStore(STORE_NAME);
            await objectStore.put(heartbeatObject, computeKey(app));
            await tx.done;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-set" /* AppError.IDB_WRITE */, {
                    originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    function computeKey(app) {
        return `${app.name}!${app.options.appId}`;
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const MAX_HEADER_BYTES = 1024;
    // 30 days
    const STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1000;
    class HeartbeatServiceImpl {
        constructor(container) {
            this.container = container;
            /**
             * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
             * the header string.
             * Stores one record per date. This will be consolidated into the standard
             * format of one record per user agent string before being sent as a header.
             * Populated from indexedDB when the controller is instantiated and should
             * be kept in sync with indexedDB.
             * Leave public for easier testing.
             */
            this._heartbeatsCache = null;
            const app = this.container.getProvider('app').getImmediate();
            this._storage = new HeartbeatStorageImpl(app);
            this._heartbeatsCachePromise = this._storage.read().then(result => {
                this._heartbeatsCache = result;
                return result;
            });
        }
        /**
         * Called to report a heartbeat. The function will generate
         * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
         * to IndexedDB.
         * Note that we only store one heartbeat per day. So if a heartbeat for today is
         * already logged, subsequent calls to this function in the same day will be ignored.
         */
        async triggerHeartbeat() {
            const platformLogger = this.container
                .getProvider('platform-logger')
                .getImmediate();
            // This is the "Firebase user agent" string from the platform logger
            // service, not the browser user agent.
            const agent = platformLogger.getPlatformInfoString();
            const date = getUTCDateString();
            if (this._heartbeatsCache === null) {
                this._heartbeatsCache = await this._heartbeatsCachePromise;
            }
            // Do not store a heartbeat if one is already stored for this day
            // or if a header has already been sent today.
            if (this._heartbeatsCache.lastSentHeartbeatDate === date ||
                this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
                return;
            }
            else {
                // There is no entry for this date. Create one.
                this._heartbeatsCache.heartbeats.push({ date, agent });
            }
            // Remove entries older than 30 days.
            this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter(singleDateHeartbeat => {
                const hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
                const now = Date.now();
                return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
            });
            return this._storage.overwrite(this._heartbeatsCache);
        }
        /**
         * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
         * It also clears all heartbeats from memory as well as in IndexedDB.
         *
         * NOTE: Consuming product SDKs should not send the header if this method
         * returns an empty string.
         */
        async getHeartbeatsHeader() {
            if (this._heartbeatsCache === null) {
                await this._heartbeatsCachePromise;
            }
            // If it's still null or the array is empty, there is no data to send.
            if (this._heartbeatsCache === null ||
                this._heartbeatsCache.heartbeats.length === 0) {
                return '';
            }
            const date = getUTCDateString();
            // Extract as many heartbeats from the cache as will fit under the size limit.
            const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
            const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
            // Store last sent date to prevent another being logged/sent for the same day.
            this._heartbeatsCache.lastSentHeartbeatDate = date;
            if (unsentEntries.length > 0) {
                // Store any unsent entries if they exist.
                this._heartbeatsCache.heartbeats = unsentEntries;
                // This seems more likely than emptying the array (below) to lead to some odd state
                // since the cache isn't empty and this will be called again on the next request,
                // and is probably safest if we await it.
                await this._storage.overwrite(this._heartbeatsCache);
            }
            else {
                this._heartbeatsCache.heartbeats = [];
                // Do not wait for this, to reduce latency.
                void this._storage.overwrite(this._heartbeatsCache);
            }
            return headerString;
        }
    }
    function getUTCDateString() {
        const today = new Date();
        // Returns date format 'YYYY-MM-DD'
        return today.toISOString().substring(0, 10);
    }
    function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
        // Heartbeats grouped by user agent in the standard format to be sent in
        // the header.
        const heartbeatsToSend = [];
        // Single date format heartbeats that are not sent.
        let unsentEntries = heartbeatsCache.slice();
        for (const singleDateHeartbeat of heartbeatsCache) {
            // Look for an existing entry with the same user agent.
            const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
            if (!heartbeatEntry) {
                // If no entry for this user agent exists, create one.
                heartbeatsToSend.push({
                    agent: singleDateHeartbeat.agent,
                    dates: [singleDateHeartbeat.date]
                });
                if (countBytes(heartbeatsToSend) > maxSize) {
                    // If the header would exceed max size, remove the added heartbeat
                    // entry and stop adding to the header.
                    heartbeatsToSend.pop();
                    break;
                }
            }
            else {
                heartbeatEntry.dates.push(singleDateHeartbeat.date);
                // If the header would exceed max size, remove the added date
                // and stop adding to the header.
                if (countBytes(heartbeatsToSend) > maxSize) {
                    heartbeatEntry.dates.pop();
                    break;
                }
            }
            // Pop unsent entry from queue. (Skipped if adding the entry exceeded
            // quota and the loop breaks early.)
            unsentEntries = unsentEntries.slice(1);
        }
        return {
            heartbeatsToSend,
            unsentEntries
        };
    }
    class HeartbeatStorageImpl {
        constructor(app) {
            this.app = app;
            this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
            if (!isIndexedDBAvailable()) {
                return false;
            }
            else {
                return validateIndexedDBOpenable()
                    .then(() => true)
                    .catch(() => false);
            }
        }
        /**
         * Read all heartbeats.
         */
        async read() {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return { heartbeats: [] };
            }
            else {
                const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
                return idbHeartbeatObject || { heartbeats: [] };
            }
        }
        // overwrite the storage with the provided heartbeats
        async overwrite(heartbeatsObject) {
            var _a;
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: heartbeatsObject.heartbeats
                });
            }
        }
        // add heartbeats
        async add(heartbeatsObject) {
            var _a;
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: [
                        ...existingHeartbeatsObject.heartbeats,
                        ...heartbeatsObject.heartbeats
                    ]
                });
            }
        }
    }
    /**
     * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
     * in a platform logging header JSON object, stringified, and converted
     * to base 64.
     */
    function countBytes(heartbeatsCache) {
        // base64 has a restricted set of characters, all of which should be 1 byte.
        return base64urlEncodeWithoutPadding(
        // heartbeatsCache wrapper properties
        JSON.stringify({ version: 2, heartbeats: heartbeatsCache })).length;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(variant) {
        _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        // Register `app` package.
        registerVersion(name$o, version$1, variant);
        // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
        registerVersion(name$o, version$1, 'esm2017');
        // Register platform SDK identifier (no version).
        registerVersion('fire-js', '');
    }

    /**
     * Firebase App
     *
     * @remarks This package coordinates the communication between the different Firebase components
     * @packageDocumentation
     */
    registerCoreComponents('');

    var name = "firebase";
    var version = "10.5.0";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerVersion(name, version, 'app');

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /*

     Copyright The Closure Library Authors.
     SPDX-License-Identifier: Apache-2.0
    */

    var k,goog=goog||{},l=commonjsGlobal||self;function aa(a){var b=typeof a;b="object"!=b?b:a?Array.isArray(a)?"array":b:"null";return "array"==b||"object"==b&&"number"==typeof a.length}function p(a){var b=typeof a;return "object"==b&&null!=a||"function"==b}function ba(a){return Object.prototype.hasOwnProperty.call(a,ca)&&a[ca]||(a[ca]=++da)}var ca="closure_uid_"+(1E9*Math.random()>>>0),da=0;function ea(a,b,c){return a.call.apply(a.bind,arguments)}
    function fa(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var e=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(e,d);return a.apply(b,e)}}return function(){return a.apply(b,arguments)}}function q(a,b,c){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?q=ea:q=fa;return q.apply(null,arguments)}
    function ha(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var d=c.slice();d.push.apply(d,arguments);return a.apply(this,d)}}function r(a,b){function c(){}c.prototype=b.prototype;a.$=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.ac=function(d,e,f){for(var h=Array(arguments.length-2),n=2;n<arguments.length;n++)h[n-2]=arguments[n];return b.prototype[e].apply(d,h)};}function v$1(){this.s=this.s;this.o=this.o;}var ia=0;v$1.prototype.s=!1;v$1.prototype.sa=function(){if(!this.s&&(this.s=!0,this.N(),0!=ia)){ba(this);}};v$1.prototype.N=function(){if(this.o)for(;this.o.length;)this.o.shift()();};const ka=Array.prototype.indexOf?function(a,b){return Array.prototype.indexOf.call(a,b,void 0)}:function(a,b){if("string"===typeof a)return "string"!==typeof b||1!=b.length?-1:a.indexOf(b,0);for(let c=0;c<a.length;c++)if(c in a&&a[c]===b)return c;return -1};function ma(a){const b=a.length;if(0<b){const c=Array(b);for(let d=0;d<b;d++)c[d]=a[d];return c}return []}
    function na(a,b){for(let c=1;c<arguments.length;c++){const d=arguments[c];if(aa(d)){const e=a.length||0,f=d.length||0;a.length=e+f;for(let h=0;h<f;h++)a[e+h]=d[h];}else a.push(d);}}function w$1(a,b){this.type=a;this.g=this.target=b;this.defaultPrevented=!1;}w$1.prototype.h=function(){this.defaultPrevented=!0;};var oa=function(){if(!l.addEventListener||!Object.defineProperty)return !1;var a=!1,b=Object.defineProperty({},"passive",{get:function(){a=!0;}});try{l.addEventListener("test",()=>{},b),l.removeEventListener("test",()=>{},b);}catch(c){}return a}();function x(a){return /^[\s\xa0]*$/.test(a)}function pa(){var a=l.navigator;return a&&(a=a.userAgent)?a:""}function y(a){return -1!=pa().indexOf(a)}function qa(a){qa[" "](a);return a}qa[" "]=function(){};function ra(a,b){var c=sa;return Object.prototype.hasOwnProperty.call(c,a)?c[a]:c[a]=b(a)}var ta=y("Opera"),z=y("Trident")||y("MSIE"),ua=y("Edge"),va=ua||z,wa=y("Gecko")&&!(-1!=pa().toLowerCase().indexOf("webkit")&&!y("Edge"))&&!(y("Trident")||y("MSIE"))&&!y("Edge"),xa=-1!=pa().toLowerCase().indexOf("webkit")&&!y("Edge");function ya(){var a=l.document;return a?a.documentMode:void 0}var za;
    a:{var Aa="",Ba=function(){var a=pa();if(wa)return /rv:([^\);]+)(\)|;)/.exec(a);if(ua)return /Edge\/([\d\.]+)/.exec(a);if(z)return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(xa)return /WebKit\/(\S+)/.exec(a);if(ta)return /(?:Version)[ \/]?(\S+)/.exec(a)}();Ba&&(Aa=Ba?Ba[1]:"");if(z){var Ca=ya();if(null!=Ca&&Ca>parseFloat(Aa)){za=String(Ca);break a}}za=Aa;}var Da;if(l.document&&z){var Ea=ya();Da=Ea?Ea:parseInt(za,10)||void 0;}else Da=void 0;var Fa=Da;function A(a,b){w$1.call(this,a?a.type:"");this.relatedTarget=this.g=this.target=null;this.button=this.screenY=this.screenX=this.clientY=this.clientX=0;this.key="";this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.state=null;this.pointerId=0;this.pointerType="";this.i=null;if(a){var c=this.type=a.type,d=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement;this.g=b;if(b=a.relatedTarget){if(wa){a:{try{qa(b.nodeName);var e=!0;break a}catch(f){}e=
    !1;}e||(b=null);}}else "mouseover"==c?b=a.fromElement:"mouseout"==c&&(b=a.toElement);this.relatedTarget=b;d?(this.clientX=void 0!==d.clientX?d.clientX:d.pageX,this.clientY=void 0!==d.clientY?d.clientY:d.pageY,this.screenX=d.screenX||0,this.screenY=d.screenY||0):(this.clientX=void 0!==a.clientX?a.clientX:a.pageX,this.clientY=void 0!==a.clientY?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0);this.button=a.button;this.key=a.key||"";this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=
    a.shiftKey;this.metaKey=a.metaKey;this.pointerId=a.pointerId||0;this.pointerType="string"===typeof a.pointerType?a.pointerType:Ga[a.pointerType]||"";this.state=a.state;this.i=a;a.defaultPrevented&&A.$.h.call(this);}}r(A,w$1);var Ga={2:"touch",3:"pen",4:"mouse"};A.prototype.h=function(){A.$.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1;};var Ha="closure_listenable_"+(1E6*Math.random()|0);var Ia=0;function Ja(a,b,c,d,e){this.listener=a;this.proxy=null;this.src=b;this.type=c;this.capture=!!d;this.la=e;this.key=++Ia;this.fa=this.ia=!1;}function Ka(a){a.fa=!0;a.listener=null;a.proxy=null;a.src=null;a.la=null;}function Na(a,b,c){for(const d in a)b.call(c,a[d],d,a);}function Oa(a,b){for(const c in a)b.call(void 0,a[c],c,a);}function Pa(a){const b={};for(const c in a)b[c]=a[c];return b}const Qa="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Ra(a,b){let c,d;for(let e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(let f=0;f<Qa.length;f++)c=Qa[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c]);}}function Sa(a){this.src=a;this.g={};this.h=0;}Sa.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.g[f];a||(a=this.g[f]=[],this.h++);var h=Ta(a,b,d,e);-1<h?(b=a[h],c||(b.ia=!1)):(b=new Ja(b,this.src,f,!!d,e),b.ia=c,a.push(b));return b};function Ua(a,b){var c=b.type;if(c in a.g){var d=a.g[c],e=ka(d,b),f;(f=0<=e)&&Array.prototype.splice.call(d,e,1);f&&(Ka(b),0==a.g[c].length&&(delete a.g[c],a.h--));}}
    function Ta(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.fa&&f.listener==b&&f.capture==!!c&&f.la==d)return e}return -1}var Va="closure_lm_"+(1E6*Math.random()|0),Wa={};function Ya(a,b,c,d,e){if(d&&d.once)return Za(a,b,c,d,e);if(Array.isArray(b)){for(var f=0;f<b.length;f++)Ya(a,b[f],c,d,e);return null}c=$a(c);return a&&a[Ha]?a.O(b,c,p(d)?!!d.capture:!!d,e):ab(a,b,c,!1,d,e)}
    function ab(a,b,c,d,e,f){if(!b)throw Error("Invalid event type");var h=p(e)?!!e.capture:!!e,n=bb(a);n||(a[Va]=n=new Sa(a));c=n.add(b,c,d,h,f);if(c.proxy)return c;d=cb();c.proxy=d;d.src=a;d.listener=c;if(a.addEventListener)oa||(e=h),void 0===e&&(e=!1),a.addEventListener(b.toString(),d,e);else if(a.attachEvent)a.attachEvent(db$1(b.toString()),d);else if(a.addListener&&a.removeListener)a.addListener(d);else throw Error("addEventListener and attachEvent are unavailable.");return c}
    function cb(){function a(c){return b.call(a.src,a.listener,c)}const b=eb;return a}function Za(a,b,c,d,e){if(Array.isArray(b)){for(var f=0;f<b.length;f++)Za(a,b[f],c,d,e);return null}c=$a(c);return a&&a[Ha]?a.P(b,c,p(d)?!!d.capture:!!d,e):ab(a,b,c,!0,d,e)}
    function fb(a,b,c,d,e){if(Array.isArray(b))for(var f=0;f<b.length;f++)fb(a,b[f],c,d,e);else (d=p(d)?!!d.capture:!!d,c=$a(c),a&&a[Ha])?(a=a.i,b=String(b).toString(),b in a.g&&(f=a.g[b],c=Ta(f,c,d,e),-1<c&&(Ka(f[c]),Array.prototype.splice.call(f,c,1),0==f.length&&(delete a.g[b],a.h--)))):a&&(a=bb(a))&&(b=a.g[b.toString()],a=-1,b&&(a=Ta(b,c,d,e)),(c=-1<a?b[a]:null)&&gb(c));}
    function gb(a){if("number"!==typeof a&&a&&!a.fa){var b=a.src;if(b&&b[Ha])Ua(b.i,a);else {var c=a.type,d=a.proxy;b.removeEventListener?b.removeEventListener(c,d,a.capture):b.detachEvent?b.detachEvent(db$1(c),d):b.addListener&&b.removeListener&&b.removeListener(d);(c=bb(b))?(Ua(c,a),0==c.h&&(c.src=null,b[Va]=null)):Ka(a);}}}function db$1(a){return a in Wa?Wa[a]:Wa[a]="on"+a}function eb(a,b){if(a.fa)a=!0;else {b=new A(b,this);var c=a.listener,d=a.la||a.src;a.ia&&gb(a);a=c.call(d,b);}return a}
    function bb(a){a=a[Va];return a instanceof Sa?a:null}var hb="__closure_events_fn_"+(1E9*Math.random()>>>0);function $a(a){if("function"===typeof a)return a;a[hb]||(a[hb]=function(b){return a.handleEvent(b)});return a[hb]}function B(){v$1.call(this);this.i=new Sa(this);this.S=this;this.J=null;}r(B,v$1);B.prototype[Ha]=!0;B.prototype.removeEventListener=function(a,b,c,d){fb(this,a,b,c,d);};
    function C$1(a,b){var c,d=a.J;if(d)for(c=[];d;d=d.J)c.push(d);a=a.S;d=b.type||b;if("string"===typeof b)b=new w$1(b,a);else if(b instanceof w$1)b.target=b.target||a;else {var e=b;b=new w$1(d,a);Ra(b,e);}e=!0;if(c)for(var f=c.length-1;0<=f;f--){var h=b.g=c[f];e=ib(h,d,!0,b)&&e;}h=b.g=a;e=ib(h,d,!0,b)&&e;e=ib(h,d,!1,b)&&e;if(c)for(f=0;f<c.length;f++)h=b.g=c[f],e=ib(h,d,!1,b)&&e;}
    B.prototype.N=function(){B.$.N.call(this);if(this.i){var a=this.i,c;for(c in a.g){for(var d=a.g[c],e=0;e<d.length;e++)Ka(d[e]);delete a.g[c];a.h--;}}this.J=null;};B.prototype.O=function(a,b,c,d){return this.i.add(String(a),b,!1,c,d)};B.prototype.P=function(a,b,c,d){return this.i.add(String(a),b,!0,c,d)};
    function ib(a,b,c,d){b=a.i.g[String(b)];if(!b)return !0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var h=b[f];if(h&&!h.fa&&h.capture==c){var n=h.listener,t=h.la||h.src;h.ia&&Ua(a.i,h);e=!1!==n.call(t,d)&&e;}}return e&&!d.defaultPrevented}var jb=l.JSON.stringify;class kb{constructor(a,b){this.i=a;this.j=b;this.h=0;this.g=null;}get(){let a;0<this.h?(this.h--,a=this.g,this.g=a.next,a.next=null):a=this.i();return a}}function lb(){var a=mb;let b=null;a.g&&(b=a.g,a.g=a.g.next,a.g||(a.h=null),b.next=null);return b}class nb{constructor(){this.h=this.g=null;}add(a,b){const c=ob.get();c.set(a,b);this.h?this.h.next=c:this.g=c;this.h=c;}}var ob=new kb(()=>new pb,a=>a.reset());class pb{constructor(){this.next=this.g=this.h=null;}set(a,b){this.h=a;this.g=b;this.next=null;}reset(){this.next=this.g=this.h=null;}}function qb(a){var b=1;a=a.split(":");const c=[];for(;0<b&&a.length;)c.push(a.shift()),b--;a.length&&c.push(a.join(":"));return c}function rb(a){l.setTimeout(()=>{throw a;},0);}let sb,tb=!1,mb=new nb,vb=()=>{const a=l.Promise.resolve(void 0);sb=()=>{a.then(ub);};};var ub=()=>{for(var a;a=lb();){try{a.h.call(a.g);}catch(c){rb(c);}var b=ob;b.j(a);100>b.h&&(b.h++,a.next=b.g,b.g=a);}tb=!1;};function wb(a,b){B.call(this);this.h=a||1;this.g=b||l;this.j=q(this.qb,this);this.l=Date.now();}r(wb,B);k=wb.prototype;k.ga=!1;k.T=null;k.qb=function(){if(this.ga){var a=Date.now()-this.l;0<a&&a<.8*this.h?this.T=this.g.setTimeout(this.j,this.h-a):(this.T&&(this.g.clearTimeout(this.T),this.T=null),C$1(this,"tick"),this.ga&&(xb(this),this.start()));}};k.start=function(){this.ga=!0;this.T||(this.T=this.g.setTimeout(this.j,this.h),this.l=Date.now());};
    function xb(a){a.ga=!1;a.T&&(a.g.clearTimeout(a.T),a.T=null);}k.N=function(){wb.$.N.call(this);xb(this);delete this.g;};function yb(a,b,c){if("function"===typeof a)c&&(a=q(a,c));else if(a&&"function"==typeof a.handleEvent)a=q(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(b)?-1:l.setTimeout(a,b||0)}function zb(a){a.g=yb(()=>{a.g=null;a.i&&(a.i=!1,zb(a));},a.j);const b=a.h;a.h=null;a.m.apply(null,b);}class Ab extends v$1{constructor(a,b){super();this.m=a;this.j=b;this.h=null;this.i=!1;this.g=null;}l(a){this.h=arguments;this.g?this.i=!0:zb(this);}N(){super.N();this.g&&(l.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null);}}function Bb(a){v$1.call(this);this.h=a;this.g={};}r(Bb,v$1);var Cb=[];function Db(a,b,c,d){Array.isArray(c)||(c&&(Cb[0]=c.toString()),c=Cb);for(var e=0;e<c.length;e++){var f=Ya(b,c[e],d||a.handleEvent,!1,a.h||a);if(!f)break;a.g[f.key]=f;}}function Fb(a){Na(a.g,function(b,c){this.g.hasOwnProperty(c)&&gb(b);},a);a.g={};}Bb.prototype.N=function(){Bb.$.N.call(this);Fb(this);};Bb.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};function Gb(){this.g=!0;}Gb.prototype.Ea=function(){this.g=!1;};function Hb(a,b,c,d,e,f){a.info(function(){if(a.g)if(f){var h="";for(var n=f.split("&"),t=0;t<n.length;t++){var m=n[t].split("=");if(1<m.length){var u=m[0];m=m[1];var L=u.split("_");h=2<=L.length&&"type"==L[1]?h+(u+"="+m+"&"):h+(u+"=redacted&");}}}else h=null;else h=f;return "XMLHTTP REQ ("+d+") [attempt "+e+"]: "+b+"\n"+c+"\n"+h});}
    function Ib(a,b,c,d,e,f,h){a.info(function(){return "XMLHTTP RESP ("+d+") [ attempt "+e+"]: "+b+"\n"+c+"\n"+f+" "+h});}function D$1(a,b,c,d){a.info(function(){return "XMLHTTP TEXT ("+b+"): "+Jb(a,c)+(d?" "+d:"")});}function Kb(a,b){a.info(function(){return "TIMEOUT: "+b});}Gb.prototype.info=function(){};
    function Jb(a,b){if(!a.g)return b;if(!b)return null;try{var c=JSON.parse(b);if(c)for(a=0;a<c.length;a++)if(Array.isArray(c[a])){var d=c[a];if(!(2>d.length)){var e=d[1];if(Array.isArray(e)&&!(1>e.length)){var f=e[0];if("noop"!=f&&"stop"!=f&&"close"!=f)for(var h=1;h<e.length;h++)e[h]="";}}}return jb(c)}catch(n){return b}}var E={},Lb=null;function Mb(){return Lb=Lb||new B}E.Ta="serverreachability";function Nb(a){w$1.call(this,E.Ta,a);}r(Nb,w$1);function Ob(a){const b=Mb();C$1(b,new Nb(b));}E.STAT_EVENT="statevent";function Pb(a,b){w$1.call(this,E.STAT_EVENT,a);this.stat=b;}r(Pb,w$1);function F(a){const b=Mb();C$1(b,new Pb(b,a));}E.Ua="timingevent";function Qb(a,b){w$1.call(this,E.Ua,a);this.size=b;}r(Qb,w$1);
    function Rb(a,b){if("function"!==typeof a)throw Error("Fn must not be null and must be a function");return l.setTimeout(function(){a();},b)}var Sb={NO_ERROR:0,rb:1,Eb:2,Db:3,yb:4,Cb:5,Fb:6,Qa:7,TIMEOUT:8,Ib:9};var Tb={wb:"complete",Sb:"success",Ra:"error",Qa:"abort",Kb:"ready",Lb:"readystatechange",TIMEOUT:"timeout",Gb:"incrementaldata",Jb:"progress",zb:"downloadprogress",$b:"uploadprogress"};function Ub(){}Ub.prototype.h=null;function Vb(a){return a.h||(a.h=a.i())}function Wb(){}var Xb={OPEN:"a",vb:"b",Ra:"c",Hb:"d"};function Yb(){w$1.call(this,"d");}r(Yb,w$1);function Zb(){w$1.call(this,"c");}r(Zb,w$1);var $b;function ac(){}r(ac,Ub);ac.prototype.g=function(){return new XMLHttpRequest};ac.prototype.i=function(){return {}};$b=new ac;function bc(a,b,c,d){this.l=a;this.j=b;this.m=c;this.W=d||1;this.U=new Bb(this);this.P=cc;a=va?125:void 0;this.V=new wb(a);this.I=null;this.i=!1;this.s=this.A=this.v=this.L=this.G=this.Y=this.B=null;this.F=[];this.g=null;this.C=0;this.o=this.u=null;this.ca=-1;this.J=!1;this.O=0;this.M=null;this.ba=this.K=this.aa=this.S=!1;this.h=new dc;}function dc(){this.i=null;this.g="";this.h=!1;}var cc=45E3,ec={},fc={};k=bc.prototype;k.setTimeout=function(a){this.P=a;};
    function gc(a,b,c){a.L=1;a.v=hc(G(b));a.s=c;a.S=!0;ic(a,null);}function ic(a,b){a.G=Date.now();jc(a);a.A=G(a.v);var c=a.A,d=a.W;Array.isArray(d)||(d=[String(d)]);kc(c.i,"t",d);a.C=0;c=a.l.J;a.h=new dc;a.g=lc(a.l,c?b:null,!a.s);0<a.O&&(a.M=new Ab(q(a.Pa,a,a.g),a.O));Db(a.U,a.g,"readystatechange",a.nb);b=a.I?Pa(a.I):{};a.s?(a.u||(a.u="POST"),b["Content-Type"]="application/x-www-form-urlencoded",a.g.ha(a.A,a.u,a.s,b)):(a.u="GET",a.g.ha(a.A,a.u,null,b));Ob();Hb(a.j,a.u,a.A,a.m,a.W,a.s);}
    k.nb=function(a){a=a.target;const b=this.M;b&&3==H(a)?b.l():this.Pa(a);};
    k.Pa=function(a){try{if(a==this.g)a:{const u=H(this.g);var b=this.g.Ia();const L=this.g.da();if(!(3>u)&&(3!=u||va||this.g&&(this.h.h||this.g.ja()||mc(this.g)))){this.J||4!=u||7==b||(8==b||0>=L?Ob(3):Ob(2));nc(this);var c=this.g.da();this.ca=c;b:if(oc(this)){var d=mc(this.g);a="";var e=d.length,f=4==H(this.g);if(!this.h.i){if("undefined"===typeof TextDecoder){I(this);pc(this);var h="";break b}this.h.i=new l.TextDecoder;}for(b=0;b<e;b++)this.h.h=!0,a+=this.h.i.decode(d[b],{stream:f&&b==e-1});d.splice(0,
    e);this.h.g+=a;this.C=0;h=this.h.g;}else h=this.g.ja();this.i=200==c;Ib(this.j,this.u,this.A,this.m,this.W,u,c);if(this.i){if(this.aa&&!this.K){b:{if(this.g){var n,t=this.g;if((n=t.g?t.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!x(n)){var m=n;break b}}m=null;}if(c=m)D$1(this.j,this.m,c,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,qc(this,c);else {this.i=!1;this.o=3;F(12);I(this);pc(this);break a}}this.S?(rc(this,u,h),va&&this.i&&3==u&&(Db(this.U,this.V,"tick",this.mb),
    this.V.start())):(D$1(this.j,this.m,h,null),qc(this,h));4==u&&I(this);this.i&&!this.J&&(4==u?sc(this.l,this):(this.i=!1,jc(this)));}else tc(this.g),400==c&&0<h.indexOf("Unknown SID")?(this.o=3,F(12)):(this.o=0,F(13)),I(this),pc(this);}}}catch(u){}finally{}};function oc(a){return a.g?"GET"==a.u&&2!=a.L&&a.l.Ha:!1}
    function rc(a,b,c){let d=!0,e;for(;!a.J&&a.C<c.length;)if(e=uc(a,c),e==fc){4==b&&(a.o=4,F(14),d=!1);D$1(a.j,a.m,null,"[Incomplete Response]");break}else if(e==ec){a.o=4;F(15);D$1(a.j,a.m,c,"[Invalid Chunk]");d=!1;break}else D$1(a.j,a.m,e,null),qc(a,e);oc(a)&&e!=fc&&e!=ec&&(a.h.g="",a.C=0);4!=b||0!=c.length||a.h.h||(a.o=1,F(16),d=!1);a.i=a.i&&d;d?0<c.length&&!a.ba&&(a.ba=!0,b=a.l,b.g==a&&b.ca&&!b.M&&(b.l.info("Great, no buffering proxy detected. Bytes received: "+c.length),vc(b),b.M=!0,F(11))):(D$1(a.j,a.m,
    c,"[Invalid Chunked Response]"),I(a),pc(a));}k.mb=function(){if(this.g){var a=H(this.g),b=this.g.ja();this.C<b.length&&(nc(this),rc(this,a,b),this.i&&4!=a&&jc(this));}};function uc(a,b){var c=a.C,d=b.indexOf("\n",c);if(-1==d)return fc;c=Number(b.substring(c,d));if(isNaN(c))return ec;d+=1;if(d+c>b.length)return fc;b=b.slice(d,d+c);a.C=d+c;return b}k.cancel=function(){this.J=!0;I(this);};function jc(a){a.Y=Date.now()+a.P;wc(a,a.P);}
    function wc(a,b){if(null!=a.B)throw Error("WatchDog timer not null");a.B=Rb(q(a.lb,a),b);}function nc(a){a.B&&(l.clearTimeout(a.B),a.B=null);}k.lb=function(){this.B=null;const a=Date.now();0<=a-this.Y?(Kb(this.j,this.A),2!=this.L&&(Ob(),F(17)),I(this),this.o=2,pc(this)):wc(this,this.Y-a);};function pc(a){0==a.l.H||a.J||sc(a.l,a);}function I(a){nc(a);var b=a.M;b&&"function"==typeof b.sa&&b.sa();a.M=null;xb(a.V);Fb(a.U);a.g&&(b=a.g,a.g=null,b.abort(),b.sa());}
    function qc(a,b){try{var c=a.l;if(0!=c.H&&(c.g==a||xc(c.i,a)))if(!a.K&&xc(c.i,a)&&3==c.H){try{var d=c.Ja.g.parse(b);}catch(m){d=null;}if(Array.isArray(d)&&3==d.length){var e=d;if(0==e[0])a:{if(!c.u){if(c.g)if(c.g.G+3E3<a.G)yc(c),zc(c);else break a;Ac(c);F(18);}}else c.Fa=e[1],0<c.Fa-c.V&&37500>e[2]&&c.G&&0==c.A&&!c.v&&(c.v=Rb(q(c.ib,c),6E3));if(1>=Bc(c.i)&&c.oa){try{c.oa();}catch(m){}c.oa=void 0;}}else J(c,11);}else if((a.K||c.g==a)&&yc(c),!x(b))for(e=c.Ja.g.parse(b),b=0;b<e.length;b++){let m=e[b];c.V=
    m[0];m=m[1];if(2==c.H)if("c"==m[0]){c.K=m[1];c.pa=m[2];const u=m[3];null!=u&&(c.ra=u,c.l.info("VER="+c.ra));const L=m[4];null!=L&&(c.Ga=L,c.l.info("SVER="+c.Ga));const La=m[5];null!=La&&"number"===typeof La&&0<La&&(d=1.5*La,c.L=d,c.l.info("backChannelRequestTimeoutMs_="+d));d=c;const la=a.g;if(la){const Ma=la.g?la.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Ma){var f=d.i;f.g||-1==Ma.indexOf("spdy")&&-1==Ma.indexOf("quic")&&-1==Ma.indexOf("h2")||(f.j=f.l,f.g=new Set,f.h&&(Cc(f,f.h),f.h=null));}if(d.F){const Eb=
    la.g?la.g.getResponseHeader("X-HTTP-Session-Id"):null;Eb&&(d.Da=Eb,K(d.I,d.F,Eb));}}c.H=3;c.h&&c.h.Ba();c.ca&&(c.S=Date.now()-a.G,c.l.info("Handshake RTT: "+c.S+"ms"));d=c;var h=a;d.wa=Dc(d,d.J?d.pa:null,d.Y);if(h.K){Ec(d.i,h);var n=h,t=d.L;t&&n.setTimeout(t);n.B&&(nc(n),jc(n));d.g=h;}else Fc(d);0<c.j.length&&Gc(c);}else "stop"!=m[0]&&"close"!=m[0]||J(c,7);else 3==c.H&&("stop"==m[0]||"close"==m[0]?"stop"==m[0]?J(c,7):Hc(c):"noop"!=m[0]&&c.h&&c.h.Aa(m),c.A=0);}Ob(4);}catch(m){}}function Ic(a){if(a.Z&&"function"==typeof a.Z)return a.Z();if("undefined"!==typeof Map&&a instanceof Map||"undefined"!==typeof Set&&a instanceof Set)return Array.from(a.values());if("string"===typeof a)return a.split("");if(aa(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}b=[];c=0;for(d in a)b[c++]=a[d];return b}
    function Jc(a){if(a.ta&&"function"==typeof a.ta)return a.ta();if(!a.Z||"function"!=typeof a.Z){if("undefined"!==typeof Map&&a instanceof Map)return Array.from(a.keys());if(!("undefined"!==typeof Set&&a instanceof Set)){if(aa(a)||"string"===typeof a){var b=[];a=a.length;for(var c=0;c<a;c++)b.push(c);return b}b=[];c=0;for(const d in a)b[c++]=d;return b}}}
    function Kc(a,b){if(a.forEach&&"function"==typeof a.forEach)a.forEach(b,void 0);else if(aa(a)||"string"===typeof a)Array.prototype.forEach.call(a,b,void 0);else for(var c=Jc(a),d=Ic(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a);}var Lc=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Mc(a,b){if(a){a=a.split("&");for(var c=0;c<a.length;c++){var d=a[c].indexOf("="),e=null;if(0<=d){var f=a[c].substring(0,d);e=a[c].substring(d+1);}else f=a[c];b(f,e?decodeURIComponent(e.replace(/\+/g," ")):"");}}}function M(a){this.g=this.s=this.j="";this.m=null;this.o=this.l="";this.h=!1;if(a instanceof M){this.h=a.h;Nc(this,a.j);this.s=a.s;this.g=a.g;Oc(this,a.m);this.l=a.l;var b=a.i;var c=new Pc;c.i=b.i;b.g&&(c.g=new Map(b.g),c.h=b.h);Qc(this,c);this.o=a.o;}else a&&(b=String(a).match(Lc))?(this.h=!1,Nc(this,b[1]||"",!0),this.s=Rc(b[2]||""),this.g=Rc(b[3]||"",!0),Oc(this,b[4]),this.l=Rc(b[5]||"",!0),Qc(this,b[6]||"",!0),this.o=Rc(b[7]||"")):(this.h=!1,this.i=new Pc(null,this.h));}
    M.prototype.toString=function(){var a=[],b=this.j;b&&a.push(Sc(b,Tc,!0),":");var c=this.g;if(c||"file"==b)a.push("//"),(b=this.s)&&a.push(Sc(b,Tc,!0),"@"),a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),c=this.m,null!=c&&a.push(":",String(c));if(c=this.l)this.g&&"/"!=c.charAt(0)&&a.push("/"),a.push(Sc(c,"/"==c.charAt(0)?Uc:Vc,!0));(c=this.i.toString())&&a.push("?",c);(c=this.o)&&a.push("#",Sc(c,Wc));return a.join("")};function G(a){return new M(a)}
    function Nc(a,b,c){a.j=c?Rc(b,!0):b;a.j&&(a.j=a.j.replace(/:$/,""));}function Oc(a,b){if(b){b=Number(b);if(isNaN(b)||0>b)throw Error("Bad port number "+b);a.m=b;}else a.m=null;}function Qc(a,b,c){b instanceof Pc?(a.i=b,Xc(a.i,a.h)):(c||(b=Sc(b,Yc)),a.i=new Pc(b,a.h));}function K(a,b,c){a.i.set(b,c);}function hc(a){K(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36));return a}
    function Rc(a,b){return a?b?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Sc(a,b,c){return "string"===typeof a?(a=encodeURI(a).replace(b,Zc),c&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Zc(a){a=a.charCodeAt(0);return "%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Tc=/[#\/\?@]/g,Vc=/[#\?:]/g,Uc=/[#\?]/g,Yc=/[#\?@]/g,Wc=/#/g;function Pc(a,b){this.h=this.g=null;this.i=a||null;this.j=!!b;}
    function N(a){a.g||(a.g=new Map,a.h=0,a.i&&Mc(a.i,function(b,c){a.add(decodeURIComponent(b.replace(/\+/g," ")),c);}));}k=Pc.prototype;k.add=function(a,b){N(this);this.i=null;a=O(this,a);var c=this.g.get(a);c||this.g.set(a,c=[]);c.push(b);this.h+=1;return this};function $c(a,b){N(a);b=O(a,b);a.g.has(b)&&(a.i=null,a.h-=a.g.get(b).length,a.g.delete(b));}function ad(a,b){N(a);b=O(a,b);return a.g.has(b)}
    k.forEach=function(a,b){N(this);this.g.forEach(function(c,d){c.forEach(function(e){a.call(b,e,d,this);},this);},this);};k.ta=function(){N(this);const a=Array.from(this.g.values()),b=Array.from(this.g.keys()),c=[];for(let d=0;d<b.length;d++){const e=a[d];for(let f=0;f<e.length;f++)c.push(b[d]);}return c};k.Z=function(a){N(this);let b=[];if("string"===typeof a)ad(this,a)&&(b=b.concat(this.g.get(O(this,a))));else {a=Array.from(this.g.values());for(let c=0;c<a.length;c++)b=b.concat(a[c]);}return b};
    k.set=function(a,b){N(this);this.i=null;a=O(this,a);ad(this,a)&&(this.h-=this.g.get(a).length);this.g.set(a,[b]);this.h+=1;return this};k.get=function(a,b){if(!a)return b;a=this.Z(a);return 0<a.length?String(a[0]):b};function kc(a,b,c){$c(a,b);0<c.length&&(a.i=null,a.g.set(O(a,b),ma(c)),a.h+=c.length);}
    k.toString=function(){if(this.i)return this.i;if(!this.g)return "";const a=[],b=Array.from(this.g.keys());for(var c=0;c<b.length;c++){var d=b[c];const f=encodeURIComponent(String(d)),h=this.Z(d);for(d=0;d<h.length;d++){var e=f;""!==h[d]&&(e+="="+encodeURIComponent(String(h[d])));a.push(e);}}return this.i=a.join("&")};function O(a,b){b=String(b);a.j&&(b=b.toLowerCase());return b}
    function Xc(a,b){b&&!a.j&&(N(a),a.i=null,a.g.forEach(function(c,d){var e=d.toLowerCase();d!=e&&($c(this,d),kc(this,e,c));},a));a.j=b;}var bd=class{constructor(a,b){this.g=a;this.map=b;}};function cd(a){this.l=a||dd;l.PerformanceNavigationTiming?(a=l.performance.getEntriesByType("navigation"),a=0<a.length&&("hq"==a[0].nextHopProtocol||"h2"==a[0].nextHopProtocol)):a=!!(l.g&&l.g.Ka&&l.g.Ka()&&l.g.Ka().dc);this.j=a?this.l:1;this.g=null;1<this.j&&(this.g=new Set);this.h=null;this.i=[];}var dd=10;function ed(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Bc(a){return a.h?1:a.g?a.g.size:0}function xc(a,b){return a.h?a.h==b:a.g?a.g.has(b):!1}function Cc(a,b){a.g?a.g.add(b):a.h=b;}
    function Ec(a,b){a.h&&a.h==b?a.h=null:a.g&&a.g.has(b)&&a.g.delete(b);}cd.prototype.cancel=function(){this.i=fd(this);if(this.h)this.h.cancel(),this.h=null;else if(this.g&&0!==this.g.size){for(const a of this.g.values())a.cancel();this.g.clear();}};function fd(a){if(null!=a.h)return a.i.concat(a.h.F);if(null!=a.g&&0!==a.g.size){let b=a.i;for(const c of a.g.values())b=b.concat(c.F);return b}return ma(a.i)}var gd=class{stringify(a){return l.JSON.stringify(a,void 0)}parse(a){return l.JSON.parse(a,void 0)}};function hd(){this.g=new gd;}function id(a,b,c){const d=c||"";try{Kc(a,function(e,f){let h=e;p(e)&&(h=jb(e));b.push(d+f+"="+encodeURIComponent(h));});}catch(e){throw b.push(d+"type="+encodeURIComponent("_badmap")),e;}}function jd(a,b){const c=new Gb;if(l.Image){const d=new Image;d.onload=ha(kd,c,d,"TestLoadImage: loaded",!0,b);d.onerror=ha(kd,c,d,"TestLoadImage: error",!1,b);d.onabort=ha(kd,c,d,"TestLoadImage: abort",!1,b);d.ontimeout=ha(kd,c,d,"TestLoadImage: timeout",!1,b);l.setTimeout(function(){if(d.ontimeout)d.ontimeout();},1E4);d.src=a;}else b(!1);}function kd(a,b,c,d,e){try{b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null,e(d);}catch(f){}}function ld(a){this.l=a.ec||null;this.j=a.ob||!1;}r(ld,Ub);ld.prototype.g=function(){return new md(this.l,this.j)};ld.prototype.i=function(a){return function(){return a}}({});function md(a,b){B.call(this);this.F=a;this.u=b;this.m=void 0;this.readyState=nd;this.status=0;this.responseType=this.responseText=this.response=this.statusText="";this.onreadystatechange=null;this.v=new Headers;this.h=null;this.C="GET";this.B="";this.g=!1;this.A=this.j=this.l=null;}r(md,B);var nd=0;k=md.prototype;
    k.open=function(a,b){if(this.readyState!=nd)throw this.abort(),Error("Error reopening a connection");this.C=a;this.B=b;this.readyState=1;od(this);};k.send=function(a){if(1!=this.readyState)throw this.abort(),Error("need to call open() first. ");this.g=!0;const b={headers:this.v,method:this.C,credentials:this.m,cache:void 0};a&&(b.body=a);(this.F||l).fetch(new Request(this.B,b)).then(this.$a.bind(this),this.ka.bind(this));};
    k.abort=function(){this.response=this.responseText="";this.v=new Headers;this.status=0;this.j&&this.j.cancel("Request was aborted.").catch(()=>{});1<=this.readyState&&this.g&&4!=this.readyState&&(this.g=!1,pd(this));this.readyState=nd;};
    k.$a=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,od(this)),this.g&&(this.readyState=3,od(this),this.g)))if("arraybuffer"===this.responseType)a.arrayBuffer().then(this.Ya.bind(this),this.ka.bind(this));else if("undefined"!==typeof l.ReadableStream&&"body"in a){this.j=a.body.getReader();if(this.u){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=
    [];}else this.response=this.responseText="",this.A=new TextDecoder;qd(this);}else a.text().then(this.Za.bind(this),this.ka.bind(this));};function qd(a){a.j.read().then(a.Xa.bind(a)).catch(a.ka.bind(a));}k.Xa=function(a){if(this.g){if(this.u&&a.value)this.response.push(a.value);else if(!this.u){var b=a.value?a.value:new Uint8Array(0);if(b=this.A.decode(b,{stream:!a.done}))this.response=this.responseText+=b;}a.done?pd(this):od(this);3==this.readyState&&qd(this);}};
    k.Za=function(a){this.g&&(this.response=this.responseText=a,pd(this));};k.Ya=function(a){this.g&&(this.response=a,pd(this));};k.ka=function(){this.g&&pd(this);};function pd(a){a.readyState=4;a.l=null;a.j=null;a.A=null;od(a);}k.setRequestHeader=function(a,b){this.v.append(a,b);};k.getResponseHeader=function(a){return this.h?this.h.get(a.toLowerCase())||"":""};
    k.getAllResponseHeaders=function(){if(!this.h)return "";const a=[],b=this.h.entries();for(var c=b.next();!c.done;)c=c.value,a.push(c[0]+": "+c[1]),c=b.next();return a.join("\r\n")};function od(a){a.onreadystatechange&&a.onreadystatechange.call(a);}Object.defineProperty(md.prototype,"withCredentials",{get:function(){return "include"===this.m},set:function(a){this.m=a?"include":"same-origin";}});var rd=l.JSON.parse;function P(a){B.call(this);this.headers=new Map;this.u=a||null;this.h=!1;this.C=this.g=null;this.I="";this.m=0;this.j="";this.l=this.G=this.v=this.F=!1;this.B=0;this.A=null;this.K=sd;this.L=this.M=!1;}r(P,B);var sd="",td=/^https?$/i,ud=["POST","PUT"];k=P.prototype;k.Oa=function(a){this.M=a;};
    k.ha=function(a,b,c,d){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.I+"; newUri="+a);b=b?b.toUpperCase():"GET";this.I=a;this.j="";this.m=0;this.F=!1;this.h=!0;this.g=this.u?this.u.g():$b.g();this.C=this.u?Vb(this.u):Vb($b);this.g.onreadystatechange=q(this.La,this);try{this.G=!0,this.g.open(b,String(a),!0),this.G=!1;}catch(f){vd(this,f);return}a=c||"";c=new Map(this.headers);if(d)if(Object.getPrototypeOf(d)===Object.prototype)for(var e in d)c.set(e,d[e]);else if("function"===
    typeof d.keys&&"function"===typeof d.get)for(const f of d.keys())c.set(f,d.get(f));else throw Error("Unknown input type for opt_headers: "+String(d));d=Array.from(c.keys()).find(f=>"content-type"==f.toLowerCase());e=l.FormData&&a instanceof l.FormData;!(0<=ka(ud,b))||d||e||c.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const [f,h]of c)this.g.setRequestHeader(f,h);this.K&&(this.g.responseType=this.K);"withCredentials"in this.g&&this.g.withCredentials!==this.M&&(this.g.withCredentials=
    this.M);try{wd(this),0<this.B&&((this.L=xd(this.g))?(this.g.timeout=this.B,this.g.ontimeout=q(this.ua,this)):this.A=yb(this.ua,this.B,this)),this.v=!0,this.g.send(a),this.v=!1;}catch(f){vd(this,f);}};function xd(a){return z&&"number"===typeof a.timeout&&void 0!==a.ontimeout}k.ua=function(){"undefined"!=typeof goog&&this.g&&(this.j="Timed out after "+this.B+"ms, aborting",this.m=8,C$1(this,"timeout"),this.abort(8));};function vd(a,b){a.h=!1;a.g&&(a.l=!0,a.g.abort(),a.l=!1);a.j=b;a.m=5;yd(a);zd(a);}
    function yd(a){a.F||(a.F=!0,C$1(a,"complete"),C$1(a,"error"));}k.abort=function(a){this.g&&this.h&&(this.h=!1,this.l=!0,this.g.abort(),this.l=!1,this.m=a||7,C$1(this,"complete"),C$1(this,"abort"),zd(this));};k.N=function(){this.g&&(this.h&&(this.h=!1,this.l=!0,this.g.abort(),this.l=!1),zd(this,!0));P.$.N.call(this);};k.La=function(){this.s||(this.G||this.v||this.l?Ad(this):this.kb());};k.kb=function(){Ad(this);};
    function Ad(a){if(a.h&&"undefined"!=typeof goog&&(!a.C[1]||4!=H(a)||2!=a.da()))if(a.v&&4==H(a))yb(a.La,0,a);else if(C$1(a,"readystatechange"),4==H(a)){a.h=!1;try{const h=a.da();a:switch(h){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var b=!0;break a;default:b=!1;}var c;if(!(c=b)){var d;if(d=0===h){var e=String(a.I).match(Lc)[1]||null;!e&&l.self&&l.self.location&&(e=l.self.location.protocol.slice(0,-1));d=!td.test(e?e.toLowerCase():"");}c=d;}if(c)C$1(a,"complete"),C$1(a,"success");else {a.m=
    6;try{var f=2<H(a)?a.g.statusText:"";}catch(n){f="";}a.j=f+" ["+a.da()+"]";yd(a);}}finally{zd(a);}}}function zd(a,b){if(a.g){wd(a);const c=a.g,d=a.C[0]?()=>{}:null;a.g=null;a.C=null;b||C$1(a,"ready");try{c.onreadystatechange=d;}catch(e){}}}function wd(a){a.g&&a.L&&(a.g.ontimeout=null);a.A&&(l.clearTimeout(a.A),a.A=null);}k.isActive=function(){return !!this.g};function H(a){return a.g?a.g.readyState:0}k.da=function(){try{return 2<H(this)?this.g.status:-1}catch(a){return -1}};
    k.ja=function(){try{return this.g?this.g.responseText:""}catch(a){return ""}};k.Wa=function(a){if(this.g){var b=this.g.responseText;a&&0==b.indexOf(a)&&(b=b.substring(a.length));return rd(b)}};function mc(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.K){case sd:case "text":return a.g.responseText;case "arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch(b){return null}}
    function tc(a){const b={};a=(a.g&&2<=H(a)?a.g.getAllResponseHeaders()||"":"").split("\r\n");for(let d=0;d<a.length;d++){if(x(a[d]))continue;var c=qb(a[d]);const e=c[0];c=c[1];if("string"!==typeof c)continue;c=c.trim();const f=b[e]||[];b[e]=f;f.push(c);}Oa(b,function(d){return d.join(", ")});}k.Ia=function(){return this.m};k.Sa=function(){return "string"===typeof this.j?this.j:String(this.j)};function Bd(a){let b="";Na(a,function(c,d){b+=d;b+=":";b+=c;b+="\r\n";});return b}function Cd(a,b,c){a:{for(d in c){var d=!1;break a}d=!0;}d||(c=Bd(c),"string"===typeof a?(null!=c&&encodeURIComponent(String(c))):K(a,b,c));}function Dd(a,b,c){return c&&c.internalChannelParams?c.internalChannelParams[a]||b:b}
    function Ed(a){this.Ga=0;this.j=[];this.l=new Gb;this.pa=this.wa=this.I=this.Y=this.g=this.Da=this.F=this.na=this.o=this.U=this.s=null;this.fb=this.W=0;this.cb=Dd("failFast",!1,a);this.G=this.v=this.u=this.m=this.h=null;this.aa=!0;this.Fa=this.V=-1;this.ba=this.A=this.C=0;this.ab=Dd("baseRetryDelayMs",5E3,a);this.hb=Dd("retryDelaySeedMs",1E4,a);this.eb=Dd("forwardChannelMaxRetries",2,a);this.xa=Dd("forwardChannelRequestTimeoutMs",2E4,a);this.va=a&&a.xmlHttpFactory||void 0;this.Ha=a&&a.useFetchStreams||
    !1;this.L=void 0;this.J=a&&a.supportsCrossDomainXhr||!1;this.K="";this.i=new cd(a&&a.concurrentRequestLimit);this.Ja=new hd;this.P=a&&a.fastHandshake||!1;this.O=a&&a.encodeInitMessageHeaders||!1;this.P&&this.O&&(this.O=!1);this.bb=a&&a.bc||!1;a&&a.Ea&&this.l.Ea();a&&a.forceLongPolling&&(this.aa=!1);this.ca=!this.P&&this.aa&&a&&a.detectBufferingProxy||!1;this.qa=void 0;a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.qa=a.longPollingTimeout);this.oa=void 0;this.S=0;this.M=!1;this.ma=this.B=null;}
    k=Ed.prototype;k.ra=8;k.H=1;function Hc(a){Fd(a);if(3==a.H){var b=a.W++,c=G(a.I);K(c,"SID",a.K);K(c,"RID",b);K(c,"TYPE","terminate");Gd(a,c);b=new bc(a,a.l,b);b.L=2;b.v=hc(G(c));c=!1;if(l.navigator&&l.navigator.sendBeacon)try{c=l.navigator.sendBeacon(b.v.toString(),"");}catch(d){}!c&&l.Image&&((new Image).src=b.v,c=!0);c||(b.g=lc(b.l,null),b.g.ha(b.v));b.G=Date.now();jc(b);}Hd(a);}function zc(a){a.g&&(vc(a),a.g.cancel(),a.g=null);}
    function Fd(a){zc(a);a.u&&(l.clearTimeout(a.u),a.u=null);yc(a);a.i.cancel();a.m&&("number"===typeof a.m&&l.clearTimeout(a.m),a.m=null);}function Gc(a){if(!ed(a.i)&&!a.m){a.m=!0;var b=a.Na;sb||vb();tb||(sb(),tb=!0);mb.add(b,a);a.C=0;}}function Id(a,b){if(Bc(a.i)>=a.i.j-(a.m?1:0))return !1;if(a.m)return a.j=b.F.concat(a.j),!0;if(1==a.H||2==a.H||a.C>=(a.cb?0:a.eb))return !1;a.m=Rb(q(a.Na,a,b),Jd(a,a.C));a.C++;return !0}
    k.Na=function(a){if(this.m)if(this.m=null,1==this.H){if(!a){this.W=Math.floor(1E5*Math.random());a=this.W++;const e=new bc(this,this.l,a);let f=this.s;this.U&&(f?(f=Pa(f),Ra(f,this.U)):f=this.U);null!==this.o||this.O||(e.I=f,f=null);if(this.P)a:{var b=0;for(var c=0;c<this.j.length;c++){b:{var d=this.j[c];if("__data__"in d.map&&(d=d.map.__data__,"string"===typeof d)){d=d.length;break b}d=void 0;}if(void 0===d)break;b+=d;if(4096<b){b=c;break a}if(4096===b||c===this.j.length-1){b=c+1;break a}}b=1E3;}else b=
    1E3;b=Kd(this,e,b);c=G(this.I);K(c,"RID",a);K(c,"CVER",22);this.F&&K(c,"X-HTTP-Session-Id",this.F);Gd(this,c);f&&(this.O?b="headers="+encodeURIComponent(String(Bd(f)))+"&"+b:this.o&&Cd(c,this.o,f));Cc(this.i,e);this.bb&&K(c,"TYPE","init");this.P?(K(c,"$req",b),K(c,"SID","null"),e.aa=!0,gc(e,c,null)):gc(e,c,b);this.H=2;}}else 3==this.H&&(a?Ld(this,a):0==this.j.length||ed(this.i)||Ld(this));};
    function Ld(a,b){var c;b?c=b.m:c=a.W++;const d=G(a.I);K(d,"SID",a.K);K(d,"RID",c);K(d,"AID",a.V);Gd(a,d);a.o&&a.s&&Cd(d,a.o,a.s);c=new bc(a,a.l,c,a.C+1);null===a.o&&(c.I=a.s);b&&(a.j=b.F.concat(a.j));b=Kd(a,c,1E3);c.setTimeout(Math.round(.5*a.xa)+Math.round(.5*a.xa*Math.random()));Cc(a.i,c);gc(c,d,b);}function Gd(a,b){a.na&&Na(a.na,function(c,d){K(b,d,c);});a.h&&Kc({},function(c,d){K(b,d,c);});}
    function Kd(a,b,c){c=Math.min(a.j.length,c);var d=a.h?q(a.h.Va,a.h,a):null;a:{var e=a.j;let f=-1;for(;;){const h=["count="+c];-1==f?0<c?(f=e[0].g,h.push("ofs="+f)):f=0:h.push("ofs="+f);let n=!0;for(let t=0;t<c;t++){let m=e[t].g;const u=e[t].map;m-=f;if(0>m)f=Math.max(0,e[t].g-100),n=!1;else try{id(u,h,"req"+m+"_");}catch(L){d&&d(u);}}if(n){d=h.join("&");break a}}}a=a.j.splice(0,c);b.F=a;return d}function Fc(a){if(!a.g&&!a.u){a.ba=1;var b=a.Ma;sb||vb();tb||(sb(),tb=!0);mb.add(b,a);a.A=0;}}
    function Ac(a){if(a.g||a.u||3<=a.A)return !1;a.ba++;a.u=Rb(q(a.Ma,a),Jd(a,a.A));a.A++;return !0}k.Ma=function(){this.u=null;Md(this);if(this.ca&&!(this.M||null==this.g||0>=this.S)){var a=2*this.S;this.l.info("BP detection timer enabled: "+a);this.B=Rb(q(this.jb,this),a);}};k.jb=function(){this.B&&(this.B=null,this.l.info("BP detection timeout reached."),this.l.info("Buffering proxy detected and switch to long-polling!"),this.G=!1,this.M=!0,F(10),zc(this),Md(this));};
    function vc(a){null!=a.B&&(l.clearTimeout(a.B),a.B=null);}function Md(a){a.g=new bc(a,a.l,"rpc",a.ba);null===a.o&&(a.g.I=a.s);a.g.O=0;var b=G(a.wa);K(b,"RID","rpc");K(b,"SID",a.K);K(b,"AID",a.V);K(b,"CI",a.G?"0":"1");!a.G&&a.qa&&K(b,"TO",a.qa);K(b,"TYPE","xmlhttp");Gd(a,b);a.o&&a.s&&Cd(b,a.o,a.s);a.L&&a.g.setTimeout(a.L);var c=a.g;a=a.pa;c.L=1;c.v=hc(G(b));c.s=null;c.S=!0;ic(c,a);}k.ib=function(){null!=this.v&&(this.v=null,zc(this),Ac(this),F(19));};
    function yc(a){null!=a.v&&(l.clearTimeout(a.v),a.v=null);}function sc(a,b){var c=null;if(a.g==b){yc(a);vc(a);a.g=null;var d=2;}else if(xc(a.i,b))c=b.F,Ec(a.i,b),d=1;else return;if(0!=a.H)if(b.i)if(1==d){c=b.s?b.s.length:0;b=Date.now()-b.G;var e=a.C;d=Mb();C$1(d,new Qb(d,c));Gc(a);}else Fc(a);else if(e=b.o,3==e||0==e&&0<b.ca||!(1==d&&Id(a,b)||2==d&&Ac(a)))switch(c&&0<c.length&&(b=a.i,b.i=b.i.concat(c)),e){case 1:J(a,5);break;case 4:J(a,10);break;case 3:J(a,6);break;default:J(a,2);}}
    function Jd(a,b){let c=a.ab+Math.floor(Math.random()*a.hb);a.isActive()||(c*=2);return c*b}function J(a,b){a.l.info("Error code "+b);if(2==b){var c=null;a.h&&(c=null);var d=q(a.pb,a);c||(c=new M("//www.google.com/images/cleardot.gif"),l.location&&"http"==l.location.protocol||Nc(c,"https"),hc(c));jd(c.toString(),d);}else F(2);a.H=0;a.h&&a.h.za(b);Hd(a);Fd(a);}k.pb=function(a){a?(this.l.info("Successfully pinged google.com"),F(2)):(this.l.info("Failed to ping google.com"),F(1));};
    function Hd(a){a.H=0;a.ma=[];if(a.h){const b=fd(a.i);if(0!=b.length||0!=a.j.length)na(a.ma,b),na(a.ma,a.j),a.i.i.length=0,ma(a.j),a.j.length=0;a.h.ya();}}function Dc(a,b,c){var d=c instanceof M?G(c):new M(c);if(""!=d.g)b&&(d.g=b+"."+d.g),Oc(d,d.m);else {var e=l.location;d=e.protocol;b=b?b+"."+e.hostname:e.hostname;e=+e.port;var f=new M(null);d&&Nc(f,d);b&&(f.g=b);e&&Oc(f,e);c&&(f.l=c);d=f;}c=a.F;b=a.Da;c&&b&&K(d,c,b);K(d,"VER",a.ra);Gd(a,d);return d}
    function lc(a,b,c){if(b&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");b=c&&a.Ha&&!a.va?new P(new ld({ob:!0})):new P(a.va);b.Oa(a.J);return b}k.isActive=function(){return !!this.h&&this.h.isActive(this)};function Nd(){}k=Nd.prototype;k.Ba=function(){};k.Aa=function(){};k.za=function(){};k.ya=function(){};k.isActive=function(){return !0};k.Va=function(){};function Od(){if(z&&!(10<=Number(Fa)))throw Error("Environmental error: no available transport.");}Od.prototype.g=function(a,b){return new Q(a,b)};
    function Q(a,b){B.call(this);this.g=new Ed(b);this.l=a;this.h=b&&b.messageUrlParams||null;a=b&&b.messageHeaders||null;b&&b.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"});this.g.s=a;a=b&&b.initMessageHeaders||null;b&&b.messageContentType&&(a?a["X-WebChannel-Content-Type"]=b.messageContentType:a={"X-WebChannel-Content-Type":b.messageContentType});b&&b.Ca&&(a?a["X-WebChannel-Client-Profile"]=b.Ca:a={"X-WebChannel-Client-Profile":b.Ca});this.g.U=
    a;(a=b&&b.cc)&&!x(a)&&(this.g.o=a);this.A=b&&b.supportsCrossDomainXhr||!1;this.v=b&&b.sendRawJson||!1;(b=b&&b.httpSessionIdParam)&&!x(b)&&(this.g.F=b,a=this.h,null!==a&&b in a&&(a=this.h,b in a&&delete a[b]));this.j=new R(this);}r(Q,B);Q.prototype.m=function(){this.g.h=this.j;this.A&&(this.g.J=!0);var a=this.g,b=this.l,c=this.h||void 0;F(0);a.Y=b;a.na=c||{};a.G=a.aa;a.I=Dc(a,null,a.Y);Gc(a);};Q.prototype.close=function(){Hc(this.g);};
    Q.prototype.u=function(a){var b=this.g;if("string"===typeof a){var c={};c.__data__=a;a=c;}else this.v&&(c={},c.__data__=jb(a),a=c);b.j.push(new bd(b.fb++,a));3==b.H&&Gc(b);};Q.prototype.N=function(){this.g.h=null;delete this.j;Hc(this.g);delete this.g;Q.$.N.call(this);};
    function Pd(a){Yb.call(this);a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var b=a.__sm__;if(b){a:{for(const c in b){a=c;break a}a=void 0;}if(this.i=a)a=this.i,b=null!==b&&a in b?b[a]:void 0;this.data=b;}else this.data=a;}r(Pd,Yb);function Qd(){Zb.call(this);this.status=1;}r(Qd,Zb);function R(a){this.g=a;}r(R,Nd);R.prototype.Ba=function(){C$1(this.g,"a");};R.prototype.Aa=function(a){C$1(this.g,new Pd(a));};
    R.prototype.za=function(a){C$1(this.g,new Qd());};R.prototype.ya=function(){C$1(this.g,"b");};function Rd(){this.blockSize=-1;}function S$1(){this.blockSize=-1;this.blockSize=64;this.g=Array(4);this.m=Array(this.blockSize);this.i=this.h=0;this.reset();}r(S$1,Rd);S$1.prototype.reset=function(){this.g[0]=1732584193;this.g[1]=4023233417;this.g[2]=2562383102;this.g[3]=271733878;this.i=this.h=0;};
    function Sd(a,b,c){c||(c=0);var d=Array(16);if("string"===typeof b)for(var e=0;16>e;++e)d[e]=b.charCodeAt(c++)|b.charCodeAt(c++)<<8|b.charCodeAt(c++)<<16|b.charCodeAt(c++)<<24;else for(e=0;16>e;++e)d[e]=b[c++]|b[c++]<<8|b[c++]<<16|b[c++]<<24;b=a.g[0];c=a.g[1];e=a.g[2];var f=a.g[3];var h=b+(f^c&(e^f))+d[0]+3614090360&4294967295;b=c+(h<<7&4294967295|h>>>25);h=f+(e^b&(c^e))+d[1]+3905402710&4294967295;f=b+(h<<12&4294967295|h>>>20);h=e+(c^f&(b^c))+d[2]+606105819&4294967295;e=f+(h<<17&4294967295|h>>>15);
    h=c+(b^e&(f^b))+d[3]+3250441966&4294967295;c=e+(h<<22&4294967295|h>>>10);h=b+(f^c&(e^f))+d[4]+4118548399&4294967295;b=c+(h<<7&4294967295|h>>>25);h=f+(e^b&(c^e))+d[5]+1200080426&4294967295;f=b+(h<<12&4294967295|h>>>20);h=e+(c^f&(b^c))+d[6]+2821735955&4294967295;e=f+(h<<17&4294967295|h>>>15);h=c+(b^e&(f^b))+d[7]+4249261313&4294967295;c=e+(h<<22&4294967295|h>>>10);h=b+(f^c&(e^f))+d[8]+1770035416&4294967295;b=c+(h<<7&4294967295|h>>>25);h=f+(e^b&(c^e))+d[9]+2336552879&4294967295;f=b+(h<<12&4294967295|
    h>>>20);h=e+(c^f&(b^c))+d[10]+4294925233&4294967295;e=f+(h<<17&4294967295|h>>>15);h=c+(b^e&(f^b))+d[11]+2304563134&4294967295;c=e+(h<<22&4294967295|h>>>10);h=b+(f^c&(e^f))+d[12]+1804603682&4294967295;b=c+(h<<7&4294967295|h>>>25);h=f+(e^b&(c^e))+d[13]+4254626195&4294967295;f=b+(h<<12&4294967295|h>>>20);h=e+(c^f&(b^c))+d[14]+2792965006&4294967295;e=f+(h<<17&4294967295|h>>>15);h=c+(b^e&(f^b))+d[15]+1236535329&4294967295;c=e+(h<<22&4294967295|h>>>10);h=b+(e^f&(c^e))+d[1]+4129170786&4294967295;b=c+(h<<
    5&4294967295|h>>>27);h=f+(c^e&(b^c))+d[6]+3225465664&4294967295;f=b+(h<<9&4294967295|h>>>23);h=e+(b^c&(f^b))+d[11]+643717713&4294967295;e=f+(h<<14&4294967295|h>>>18);h=c+(f^b&(e^f))+d[0]+3921069994&4294967295;c=e+(h<<20&4294967295|h>>>12);h=b+(e^f&(c^e))+d[5]+3593408605&4294967295;b=c+(h<<5&4294967295|h>>>27);h=f+(c^e&(b^c))+d[10]+38016083&4294967295;f=b+(h<<9&4294967295|h>>>23);h=e+(b^c&(f^b))+d[15]+3634488961&4294967295;e=f+(h<<14&4294967295|h>>>18);h=c+(f^b&(e^f))+d[4]+3889429448&4294967295;c=
    e+(h<<20&4294967295|h>>>12);h=b+(e^f&(c^e))+d[9]+568446438&4294967295;b=c+(h<<5&4294967295|h>>>27);h=f+(c^e&(b^c))+d[14]+3275163606&4294967295;f=b+(h<<9&4294967295|h>>>23);h=e+(b^c&(f^b))+d[3]+4107603335&4294967295;e=f+(h<<14&4294967295|h>>>18);h=c+(f^b&(e^f))+d[8]+1163531501&4294967295;c=e+(h<<20&4294967295|h>>>12);h=b+(e^f&(c^e))+d[13]+2850285829&4294967295;b=c+(h<<5&4294967295|h>>>27);h=f+(c^e&(b^c))+d[2]+4243563512&4294967295;f=b+(h<<9&4294967295|h>>>23);h=e+(b^c&(f^b))+d[7]+1735328473&4294967295;
    e=f+(h<<14&4294967295|h>>>18);h=c+(f^b&(e^f))+d[12]+2368359562&4294967295;c=e+(h<<20&4294967295|h>>>12);h=b+(c^e^f)+d[5]+4294588738&4294967295;b=c+(h<<4&4294967295|h>>>28);h=f+(b^c^e)+d[8]+2272392833&4294967295;f=b+(h<<11&4294967295|h>>>21);h=e+(f^b^c)+d[11]+1839030562&4294967295;e=f+(h<<16&4294967295|h>>>16);h=c+(e^f^b)+d[14]+4259657740&4294967295;c=e+(h<<23&4294967295|h>>>9);h=b+(c^e^f)+d[1]+2763975236&4294967295;b=c+(h<<4&4294967295|h>>>28);h=f+(b^c^e)+d[4]+1272893353&4294967295;f=b+(h<<11&4294967295|
    h>>>21);h=e+(f^b^c)+d[7]+4139469664&4294967295;e=f+(h<<16&4294967295|h>>>16);h=c+(e^f^b)+d[10]+3200236656&4294967295;c=e+(h<<23&4294967295|h>>>9);h=b+(c^e^f)+d[13]+681279174&4294967295;b=c+(h<<4&4294967295|h>>>28);h=f+(b^c^e)+d[0]+3936430074&4294967295;f=b+(h<<11&4294967295|h>>>21);h=e+(f^b^c)+d[3]+3572445317&4294967295;e=f+(h<<16&4294967295|h>>>16);h=c+(e^f^b)+d[6]+76029189&4294967295;c=e+(h<<23&4294967295|h>>>9);h=b+(c^e^f)+d[9]+3654602809&4294967295;b=c+(h<<4&4294967295|h>>>28);h=f+(b^c^e)+d[12]+
    3873151461&4294967295;f=b+(h<<11&4294967295|h>>>21);h=e+(f^b^c)+d[15]+530742520&4294967295;e=f+(h<<16&4294967295|h>>>16);h=c+(e^f^b)+d[2]+3299628645&4294967295;c=e+(h<<23&4294967295|h>>>9);h=b+(e^(c|~f))+d[0]+4096336452&4294967295;b=c+(h<<6&4294967295|h>>>26);h=f+(c^(b|~e))+d[7]+1126891415&4294967295;f=b+(h<<10&4294967295|h>>>22);h=e+(b^(f|~c))+d[14]+2878612391&4294967295;e=f+(h<<15&4294967295|h>>>17);h=c+(f^(e|~b))+d[5]+4237533241&4294967295;c=e+(h<<21&4294967295|h>>>11);h=b+(e^(c|~f))+d[12]+1700485571&
    4294967295;b=c+(h<<6&4294967295|h>>>26);h=f+(c^(b|~e))+d[3]+2399980690&4294967295;f=b+(h<<10&4294967295|h>>>22);h=e+(b^(f|~c))+d[10]+4293915773&4294967295;e=f+(h<<15&4294967295|h>>>17);h=c+(f^(e|~b))+d[1]+2240044497&4294967295;c=e+(h<<21&4294967295|h>>>11);h=b+(e^(c|~f))+d[8]+1873313359&4294967295;b=c+(h<<6&4294967295|h>>>26);h=f+(c^(b|~e))+d[15]+4264355552&4294967295;f=b+(h<<10&4294967295|h>>>22);h=e+(b^(f|~c))+d[6]+2734768916&4294967295;e=f+(h<<15&4294967295|h>>>17);h=c+(f^(e|~b))+d[13]+1309151649&
    4294967295;c=e+(h<<21&4294967295|h>>>11);h=b+(e^(c|~f))+d[4]+4149444226&4294967295;b=c+(h<<6&4294967295|h>>>26);h=f+(c^(b|~e))+d[11]+3174756917&4294967295;f=b+(h<<10&4294967295|h>>>22);h=e+(b^(f|~c))+d[2]+718787259&4294967295;e=f+(h<<15&4294967295|h>>>17);h=c+(f^(e|~b))+d[9]+3951481745&4294967295;a.g[0]=a.g[0]+b&4294967295;a.g[1]=a.g[1]+(e+(h<<21&4294967295|h>>>11))&4294967295;a.g[2]=a.g[2]+e&4294967295;a.g[3]=a.g[3]+f&4294967295;}
    S$1.prototype.j=function(a,b){void 0===b&&(b=a.length);for(var c=b-this.blockSize,d=this.m,e=this.h,f=0;f<b;){if(0==e)for(;f<=c;)Sd(this,a,f),f+=this.blockSize;if("string"===typeof a)for(;f<b;){if(d[e++]=a.charCodeAt(f++),e==this.blockSize){Sd(this,d);e=0;break}}else for(;f<b;)if(d[e++]=a[f++],e==this.blockSize){Sd(this,d);e=0;break}}this.h=e;this.i+=b;};
    S$1.prototype.l=function(){var a=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);a[0]=128;for(var b=1;b<a.length-8;++b)a[b]=0;var c=8*this.i;for(b=a.length-8;b<a.length;++b)a[b]=c&255,c/=256;this.j(a);a=Array(16);for(b=c=0;4>b;++b)for(var d=0;32>d;d+=8)a[c++]=this.g[b]>>>d&255;return a};function T(a,b){this.h=b;for(var c=[],d=!0,e=a.length-1;0<=e;e--){var f=a[e]|0;d&&f==b||(c[e]=f,d=!1);}this.g=c;}var sa={};function Td(a){return -128<=a&&128>a?ra(a,function(b){return new T([b|0],0>b?-1:0)}):new T([a|0],0>a?-1:0)}function U(a){if(isNaN(a)||!isFinite(a))return V;if(0>a)return W(U(-a));for(var b=[],c=1,d=0;a>=c;d++)b[d]=a/c|0,c*=Ud;return new T(b,0)}
    function Vd(a,b){if(0==a.length)throw Error("number format error: empty string");b=b||10;if(2>b||36<b)throw Error("radix out of range: "+b);if("-"==a.charAt(0))return W(Vd(a.substring(1),b));if(0<=a.indexOf("-"))throw Error('number format error: interior "-" character');for(var c=U(Math.pow(b,8)),d=V,e=0;e<a.length;e+=8){var f=Math.min(8,a.length-e),h=parseInt(a.substring(e,e+f),b);8>f?(f=U(Math.pow(b,f)),d=d.R(f).add(U(h))):(d=d.R(c),d=d.add(U(h)));}return d}
    var Ud=4294967296,V=Td(0),Wd=Td(1),Xd=Td(16777216);k=T.prototype;k.ea=function(){if(X(this))return -W(this).ea();for(var a=0,b=1,c=0;c<this.g.length;c++){var d=this.D(c);a+=(0<=d?d:Ud+d)*b;b*=Ud;}return a};
    k.toString=function(a){a=a||10;if(2>a||36<a)throw Error("radix out of range: "+a);if(Y(this))return "0";if(X(this))return "-"+W(this).toString(a);for(var b=U(Math.pow(a,6)),c=this,d="";;){var e=Yd(c,b).g;c=Zd(c,e.R(b));var f=((0<c.g.length?c.g[0]:c.h)>>>0).toString(a);c=e;if(Y(c))return f+d;for(;6>f.length;)f="0"+f;d=f+d;}};k.D=function(a){return 0>a?0:a<this.g.length?this.g[a]:this.h};function Y(a){if(0!=a.h)return !1;for(var b=0;b<a.g.length;b++)if(0!=a.g[b])return !1;return !0}
    function X(a){return -1==a.h}k.X=function(a){a=Zd(this,a);return X(a)?-1:Y(a)?0:1};function W(a){for(var b=a.g.length,c=[],d=0;d<b;d++)c[d]=~a.g[d];return (new T(c,~a.h)).add(Wd)}k.abs=function(){return X(this)?W(this):this};k.add=function(a){for(var b=Math.max(this.g.length,a.g.length),c=[],d=0,e=0;e<=b;e++){var f=d+(this.D(e)&65535)+(a.D(e)&65535),h=(f>>>16)+(this.D(e)>>>16)+(a.D(e)>>>16);d=h>>>16;f&=65535;h&=65535;c[e]=h<<16|f;}return new T(c,c[c.length-1]&-2147483648?-1:0)};
    function Zd(a,b){return a.add(W(b))}
    k.R=function(a){if(Y(this)||Y(a))return V;if(X(this))return X(a)?W(this).R(W(a)):W(W(this).R(a));if(X(a))return W(this.R(W(a)));if(0>this.X(Xd)&&0>a.X(Xd))return U(this.ea()*a.ea());for(var b=this.g.length+a.g.length,c=[],d=0;d<2*b;d++)c[d]=0;for(d=0;d<this.g.length;d++)for(var e=0;e<a.g.length;e++){var f=this.D(d)>>>16,h=this.D(d)&65535,n=a.D(e)>>>16,t=a.D(e)&65535;c[2*d+2*e]+=h*t;$d(c,2*d+2*e);c[2*d+2*e+1]+=f*t;$d(c,2*d+2*e+1);c[2*d+2*e+1]+=h*n;$d(c,2*d+2*e+1);c[2*d+2*e+2]+=f*n;$d(c,2*d+2*e+2);}for(d=
    0;d<b;d++)c[d]=c[2*d+1]<<16|c[2*d];for(d=b;d<2*b;d++)c[d]=0;return new T(c,0)};function $d(a,b){for(;(a[b]&65535)!=a[b];)a[b+1]+=a[b]>>>16,a[b]&=65535,b++;}function ae$1(a,b){this.g=a;this.h=b;}
    function Yd(a,b){if(Y(b))throw Error("division by zero");if(Y(a))return new ae$1(V,V);if(X(a))return b=Yd(W(a),b),new ae$1(W(b.g),W(b.h));if(X(b))return b=Yd(a,W(b)),new ae$1(W(b.g),b.h);if(30<a.g.length){if(X(a)||X(b))throw Error("slowDivide_ only works with positive integers.");for(var c=Wd,d=b;0>=d.X(a);)c=be(c),d=be(d);var e=Z(c,1),f=Z(d,1);d=Z(d,2);for(c=Z(c,2);!Y(d);){var h=f.add(d);0>=h.X(a)&&(e=e.add(c),f=h);d=Z(d,1);c=Z(c,1);}b=Zd(a,e.R(b));return new ae$1(e,b)}for(e=V;0<=a.X(b);){c=Math.max(1,Math.floor(a.ea()/
    b.ea()));d=Math.ceil(Math.log(c)/Math.LN2);d=48>=d?1:Math.pow(2,d-48);f=U(c);for(h=f.R(b);X(h)||0<h.X(a);)c-=d,f=U(c),h=f.R(b);Y(f)&&(f=Wd);e=e.add(f);a=Zd(a,h);}return new ae$1(e,a)}k.gb=function(a){return Yd(this,a).h};k.and=function(a){for(var b=Math.max(this.g.length,a.g.length),c=[],d=0;d<b;d++)c[d]=this.D(d)&a.D(d);return new T(c,this.h&a.h)};k.or=function(a){for(var b=Math.max(this.g.length,a.g.length),c=[],d=0;d<b;d++)c[d]=this.D(d)|a.D(d);return new T(c,this.h|a.h)};
    k.xor=function(a){for(var b=Math.max(this.g.length,a.g.length),c=[],d=0;d<b;d++)c[d]=this.D(d)^a.D(d);return new T(c,this.h^a.h)};function be(a){for(var b=a.g.length+1,c=[],d=0;d<b;d++)c[d]=a.D(d)<<1|a.D(d-1)>>>31;return new T(c,a.h)}function Z(a,b){var c=b>>5;b%=32;for(var d=a.g.length-c,e=[],f=0;f<d;f++)e[f]=0<b?a.D(f+c)>>>b|a.D(f+c+1)<<32-b:a.D(f+c);return new T(e,a.h)}Od.prototype.createWebChannel=Od.prototype.g;Q.prototype.send=Q.prototype.u;Q.prototype.open=Q.prototype.m;Q.prototype.close=Q.prototype.close;Sb.NO_ERROR=0;Sb.TIMEOUT=8;Sb.HTTP_ERROR=6;Tb.COMPLETE="complete";Wb.EventType=Xb;Xb.OPEN="a";Xb.CLOSE="b";Xb.ERROR="c";Xb.MESSAGE="d";B.prototype.listen=B.prototype.O;P.prototype.listenOnce=P.prototype.P;P.prototype.getLastError=P.prototype.Sa;P.prototype.getLastErrorCode=P.prototype.Ia;P.prototype.getStatus=P.prototype.da;P.prototype.getResponseJson=P.prototype.Wa;
    P.prototype.getResponseText=P.prototype.ja;P.prototype.send=P.prototype.ha;P.prototype.setWithCredentials=P.prototype.Oa;S$1.prototype.digest=S$1.prototype.l;S$1.prototype.reset=S$1.prototype.reset;S$1.prototype.update=S$1.prototype.j;T.prototype.add=T.prototype.add;T.prototype.multiply=T.prototype.R;T.prototype.modulo=T.prototype.gb;T.prototype.compare=T.prototype.X;T.prototype.toNumber=T.prototype.ea;T.prototype.toString=T.prototype.toString;T.prototype.getBits=T.prototype.D;T.fromNumber=U;T.fromString=Vd;
    var createWebChannelTransport = function(){return new Od};var getStatEventTarget = function(){return Mb()};var ErrorCode = Sb;var EventType = Tb;var Event = E;var Stat = {xb:0,Ab:1,Bb:2,Ub:3,Zb:4,Wb:5,Xb:6,Vb:7,Tb:8,Yb:9,PROXY:10,NOPROXY:11,Rb:12,Nb:13,Ob:14,Mb:15,Pb:16,Qb:17,tb:18,sb:19,ub:20};var WebChannel = Wb;var XhrIo = P;var Integer = T;

    const w = "@firebase/firestore";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Simple wrapper around a nullable UID. Mostly exists to make code more
     * readable.
     */
    class User {
        constructor(e) {
            this.uid = e;
        }
        isAuthenticated() {
            return null != this.uid;
        }
        /**
         * Returns a key representing this user, suitable for inclusion in a
         * dictionary.
         */    toKey() {
            return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
        }
        isEqual(e) {
            return e.uid === this.uid;
        }
    }

    /** A user with a null UID. */ User.UNAUTHENTICATED = new User(null), 
    // TODO(mikelehen): Look into getting a proper uid-equivalent for
    // non-FirebaseAuth providers.
    User.GOOGLE_CREDENTIALS = new User("google-credentials-uid"), User.FIRST_PARTY = new User("first-party-uid"), 
    User.MOCK_USER = new User("mock-user");

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    let S = "10.5.0";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const b = new Logger("@firebase/firestore");

    // Helper methods are needed because variables can't be exported as read/write
    function __PRIVATE_getLogLevel() {
        return b.logLevel;
    }

    function __PRIVATE_logDebug(e, ...t) {
        if (b.logLevel <= LogLevel.DEBUG) {
            const n = t.map(__PRIVATE_argToString);
            b.debug(`Firestore (${S}): ${e}`, ...n);
        }
    }

    function __PRIVATE_logError(e, ...t) {
        if (b.logLevel <= LogLevel.ERROR) {
            const n = t.map(__PRIVATE_argToString);
            b.error(`Firestore (${S}): ${e}`, ...n);
        }
    }

    /**
     * @internal
     */ function __PRIVATE_logWarn(e, ...t) {
        if (b.logLevel <= LogLevel.WARN) {
            const n = t.map(__PRIVATE_argToString);
            b.warn(`Firestore (${S}): ${e}`, ...n);
        }
    }

    /**
     * Converts an additional log parameter to a string representation.
     */ function __PRIVATE_argToString(e) {
        if ("string" == typeof e) return e;
        try {
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            /** Formats an object as a JSON string, suitable for logging. */
            return function __PRIVATE_formatJSON(e) {
                return JSON.stringify(e);
            }(e);
        } catch (t) {
            // Converting to JSON failed, just log the object directly
            return e;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Unconditionally fails, throwing an Error with the given message.
     * Messages are stripped in production builds.
     *
     * Returns `never` and can be used in expressions:
     * @example
     * let futureVar = fail('not implemented yet');
     */ function fail(e = "Unexpected state") {
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
        const t = `FIRESTORE (${S}) INTERNAL ASSERTION FAILED: ` + e;
        // NOTE: We don't use FirestoreError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
        throw __PRIVATE_logError(t), new Error(t);
    }

    /**
     * Fails if the given assertion condition is false, throwing an Error with the
     * given message if it did.
     *
     * Messages are stripped in production builds.
     */ function __PRIVATE_hardAssert(e, t) {
        e || fail();
    }

    /**
     * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
     * instance of `T` before casting.
     */ function __PRIVATE_debugCast(e, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        return e;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const D = {
        // Causes are copied from:
        // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
        /** Not an error; returned on success. */
        OK: "ok",
        /** The operation was cancelled (typically by the caller). */
        CANCELLED: "cancelled",
        /** Unknown error or an error from a different error domain. */
        UNKNOWN: "unknown",
        /**
         * Client specified an invalid argument. Note that this differs from
         * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
         * problematic regardless of the state of the system (e.g., a malformed file
         * name).
         */
        INVALID_ARGUMENT: "invalid-argument",
        /**
         * Deadline expired before operation could complete. For operations that
         * change the state of the system, this error may be returned even if the
         * operation has completed successfully. For example, a successful response
         * from a server could have been delayed long enough for the deadline to
         * expire.
         */
        DEADLINE_EXCEEDED: "deadline-exceeded",
        /** Some requested entity (e.g., file or directory) was not found. */
        NOT_FOUND: "not-found",
        /**
         * Some entity that we attempted to create (e.g., file or directory) already
         * exists.
         */
        ALREADY_EXISTS: "already-exists",
        /**
         * The caller does not have permission to execute the specified operation.
         * PERMISSION_DENIED must not be used for rejections caused by exhausting
         * some resource (use RESOURCE_EXHAUSTED instead for those errors).
         * PERMISSION_DENIED must not be used if the caller can not be identified
         * (use UNAUTHENTICATED instead for those errors).
         */
        PERMISSION_DENIED: "permission-denied",
        /**
         * The request does not have valid authentication credentials for the
         * operation.
         */
        UNAUTHENTICATED: "unauthenticated",
        /**
         * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
         * entire file system is out of space.
         */
        RESOURCE_EXHAUSTED: "resource-exhausted",
        /**
         * Operation was rejected because the system is not in a state required for
         * the operation's execution. For example, directory to be deleted may be
         * non-empty, an rmdir operation is applied to a non-directory, etc.
         *
         * A litmus test that may help a service implementor in deciding
         * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
         *  (a) Use UNAVAILABLE if the client can retry just the failing call.
         *  (b) Use ABORTED if the client should retry at a higher-level
         *      (e.g., restarting a read-modify-write sequence).
         *  (c) Use FAILED_PRECONDITION if the client should not retry until
         *      the system state has been explicitly fixed. E.g., if an "rmdir"
         *      fails because the directory is non-empty, FAILED_PRECONDITION
         *      should be returned since the client should not retry unless
         *      they have first fixed up the directory by deleting files from it.
         *  (d) Use FAILED_PRECONDITION if the client performs conditional
         *      REST Get/Update/Delete on a resource and the resource on the
         *      server does not match the condition. E.g., conflicting
         *      read-modify-write on the same resource.
         */
        FAILED_PRECONDITION: "failed-precondition",
        /**
         * The operation was aborted, typically due to a concurrency issue like
         * sequencer check failures, transaction aborts, etc.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        ABORTED: "aborted",
        /**
         * Operation was attempted past the valid range. E.g., seeking or reading
         * past end of file.
         *
         * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
         * if the system state changes. For example, a 32-bit file system will
         * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
         * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
         * an offset past the current file size.
         *
         * There is a fair bit of overlap between FAILED_PRECONDITION and
         * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
         * when it applies so that callers who are iterating through a space can
         * easily look for an OUT_OF_RANGE error to detect when they are done.
         */
        OUT_OF_RANGE: "out-of-range",
        /** Operation is not implemented or not supported/enabled in this service. */
        UNIMPLEMENTED: "unimplemented",
        /**
         * Internal errors. Means some invariants expected by underlying System has
         * been broken. If you see one of these errors, Something is very broken.
         */
        INTERNAL: "internal",
        /**
         * The service is currently unavailable. This is a most likely a transient
         * condition and may be corrected by retrying with a backoff.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        UNAVAILABLE: "unavailable",
        /** Unrecoverable data loss or corruption. */
        DATA_LOSS: "data-loss"
    };

    /** An error returned by a Firestore operation. */ class FirestoreError extends FirebaseError {
        /** @hideconstructor */
        constructor(
        /**
         * The backend error code associated with this error.
         */
        e, 
        /**
         * A custom error description.
         */
        t) {
            super(e, t), this.code = e, this.message = t, 
            // HACK: We write a toString property directly because Error is not a real
            // class and so inheritance does not work correctly. We could alternatively
            // do the same "back-door inheritance" trick that FirebaseError does.
            this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_Deferred {
        constructor() {
            this.promise = new Promise(((e, t) => {
                this.resolve = e, this.reject = t;
            }));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_OAuthToken {
        constructor(e, t) {
            this.user = t, this.type = "OAuth", this.headers = new Map, this.headers.set("Authorization", `Bearer ${e}`);
        }
    }

    /**
     * A CredentialsProvider that always yields an empty token.
     * @internal
     */ class __PRIVATE_EmptyAuthCredentialsProvider {
        getToken() {
            return Promise.resolve(null);
        }
        invalidateToken() {}
        start(e, t) {
            // Fire with initial user.
            e.enqueueRetryable((() => t(User.UNAUTHENTICATED)));
        }
        shutdown() {}
    }

    /**
     * A CredentialsProvider that always returns a constant token. Used for
     * emulator token mocking.
     */ class __PRIVATE_EmulatorAuthCredentialsProvider {
        constructor(e) {
            this.token = e, 
            /**
             * Stores the listener registered with setChangeListener()
             * This isn't actually necessary since the UID never changes, but we use this
             * to verify the listen contract is adhered to in tests.
             */
            this.changeListener = null;
        }
        getToken() {
            return Promise.resolve(this.token);
        }
        invalidateToken() {}
        start(e, t) {
            this.changeListener = t, 
            // Fire with initial user.
            e.enqueueRetryable((() => t(this.token.user)));
        }
        shutdown() {
            this.changeListener = null;
        }
    }

    class __PRIVATE_FirebaseAuthCredentialsProvider {
        constructor(e) {
            this.t = e, 
            /** Tracks the current User. */
            this.currentUser = User.UNAUTHENTICATED, 
            /**
             * Counter used to detect if the token changed while a getToken request was
             * outstanding.
             */
            this.i = 0, this.forceRefresh = !1, this.auth = null;
        }
        start(e, t) {
            let n = this.i;
            // A change listener that prevents double-firing for the same token change.
                    const __PRIVATE_guardedChangeListener = e => this.i !== n ? (n = this.i, 
            t(e)) : Promise.resolve();
            // A promise that can be waited on to block on the next token change.
            // This promise is re-created after each change.
                    let r = new __PRIVATE_Deferred;
            this.o = () => {
                this.i++, this.currentUser = this.u(), r.resolve(), r = new __PRIVATE_Deferred, 
                e.enqueueRetryable((() => __PRIVATE_guardedChangeListener(this.currentUser)));
            };
            const __PRIVATE_awaitNextToken = () => {
                const t = r;
                e.enqueueRetryable((async () => {
                    await t.promise, await __PRIVATE_guardedChangeListener(this.currentUser);
                }));
            }, __PRIVATE_registerAuth = e => {
                __PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = e, 
                this.auth.addAuthTokenListener(this.o), __PRIVATE_awaitNextToken();
            };
            this.t.onInit((e => __PRIVATE_registerAuth(e))), 
            // Our users can initialize Auth right after Firestore, so we give it
            // a chance to register itself with the component framework before we
            // determine whether to start up in unauthenticated mode.
            setTimeout((() => {
                if (!this.auth) {
                    const e = this.t.getImmediate({
                        optional: !0
                    });
                    e ? __PRIVATE_registerAuth(e) : (
                    // If auth is still not available, proceed with `null` user
                    __PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth not yet detected"), 
                    r.resolve(), r = new __PRIVATE_Deferred);
                }
            }), 0), __PRIVATE_awaitNextToken();
        }
        getToken() {
            // Take note of the current value of the tokenCounter so that this method
            // can fail (with an ABORTED error) if there is a token change while the
            // request is outstanding.
            const e = this.i, t = this.forceRefresh;
            return this.forceRefresh = !1, this.auth ? this.auth.getToken(t).then((t => 
            // Cancel the request since the token changed while the request was
            // outstanding so the response is potentially for a previous user (which
            // user, we can't be sure).
            this.i !== e ? (__PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), 
            this.getToken()) : t ? (__PRIVATE_hardAssert("string" == typeof t.accessToken), 
            new __PRIVATE_OAuthToken(t.accessToken, this.currentUser)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = !0;
        }
        shutdown() {
            this.auth && this.auth.removeAuthTokenListener(this.o);
        }
        // Auth.getUid() can return null even with a user logged in. It is because
        // getUid() is synchronous, but the auth code populating Uid is asynchronous.
        // This method should only be called in the AuthTokenListener callback
        // to guarantee to get the actual user.
        u() {
            const e = this.auth && this.auth.getUid();
            return __PRIVATE_hardAssert(null === e || "string" == typeof e), new User(e);
        }
    }

    /*
     * FirstPartyToken provides a fresh token each time its value
     * is requested, because if the token is too old, requests will be rejected.
     * Technically this may no longer be necessary since the SDK should gracefully
     * recover from unauthenticated errors (see b/33147818 for context), but it's
     * safer to keep the implementation as-is.
     */ class __PRIVATE_FirstPartyToken {
        constructor(e, t, n) {
            this.l = e, this.h = t, this.P = n, this.type = "FirstParty", this.user = User.FIRST_PARTY, 
            this.I = new Map;
        }
        /**
         * Gets an authorization token, using a provided factory function, or return
         * null.
         */    T() {
            return this.P ? this.P() : null;
        }
        get headers() {
            this.I.set("X-Goog-AuthUser", this.l);
            // Use array notation to prevent minification
            const e = this.T();
            return e && this.I.set("Authorization", e), this.h && this.I.set("X-Goog-Iam-Authorization-Token", this.h), 
            this.I;
        }
    }

    /*
     * Provides user credentials required for the Firestore JavaScript SDK
     * to authenticate the user, using technique that is only available
     * to applications hosted by Google.
     */ class __PRIVATE_FirstPartyAuthCredentialsProvider {
        constructor(e, t, n) {
            this.l = e, this.h = t, this.P = n;
        }
        getToken() {
            return Promise.resolve(new __PRIVATE_FirstPartyToken(this.l, this.h, this.P));
        }
        start(e, t) {
            // Fire with initial uid.
            e.enqueueRetryable((() => t(User.FIRST_PARTY)));
        }
        shutdown() {}
        invalidateToken() {}
    }

    class AppCheckToken {
        constructor(e) {
            this.value = e, this.type = "AppCheck", this.headers = new Map, e && e.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
        }
    }

    class __PRIVATE_FirebaseAppCheckTokenProvider {
        constructor(e) {
            this.A = e, this.forceRefresh = !1, this.appCheck = null, this.R = null;
        }
        start(e, t) {
            const onTokenChanged = e => {
                null != e.error && __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${e.error.message}`);
                const n = e.token !== this.R;
                return this.R = e.token, __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Received ${n ? "new" : "existing"} token.`), 
                n ? t(e.token) : Promise.resolve();
            };
            this.o = t => {
                e.enqueueRetryable((() => onTokenChanged(t)));
            };
            const __PRIVATE_registerAppCheck = e => {
                __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = e, 
                this.appCheck.addTokenListener(this.o);
            };
            this.A.onInit((e => __PRIVATE_registerAppCheck(e))), 
            // Our users can initialize AppCheck after Firestore, so we give it
            // a chance to register itself with the component framework.
            setTimeout((() => {
                if (!this.appCheck) {
                    const e = this.A.getImmediate({
                        optional: !0
                    });
                    e ? __PRIVATE_registerAppCheck(e) : 
                    // If AppCheck is still not available, proceed without it.
                    __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck not yet detected");
                }
            }), 0);
        }
        getToken() {
            const e = this.forceRefresh;
            return this.forceRefresh = !1, this.appCheck ? this.appCheck.getToken(e).then((e => e ? (__PRIVATE_hardAssert("string" == typeof e.token), 
            this.R = e.token, new AppCheckToken(e.token)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = !0;
        }
        shutdown() {
            this.appCheck && this.appCheck.removeTokenListener(this.o);
        }
    }

    /**
     * Builds a CredentialsProvider depending on the type of
     * the credentials passed in.
     */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Generates `nBytes` of random bytes.
     *
     * If `nBytes < 0` , an error will be thrown.
     */
    function __PRIVATE_randomBytes(e) {
        // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
        const t = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(e);
        if (t && "function" == typeof t.getRandomValues) t.getRandomValues(n); else 
        // Falls back to Math.random
        for (let t = 0; t < e; t++) n[t] = Math.floor(256 * Math.random());
        return n;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_AutoId {
        static V() {
            // Alphanumeric characters
            const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", t = Math.floor(256 / e.length) * e.length;
            // The largest byte value that is a multiple of `char.length`.
                    let n = "";
            for (;n.length < 20; ) {
                const r = __PRIVATE_randomBytes(40);
                for (let i = 0; i < r.length; ++i) 
                // Only accept values that are [0, maxMultiple), this ensures they can
                // be evenly mapped to indices of `chars` via a modulo operation.
                n.length < 20 && r[i] < t && (n += e.charAt(r[i] % e.length));
            }
            return n;
        }
    }

    function __PRIVATE_primitiveComparator(e, t) {
        return e < t ? -1 : e > t ? 1 : 0;
    }

    /** Helper to compare arrays using isEqual(). */ function __PRIVATE_arrayEquals(e, t, n) {
        return e.length === t.length && e.every(((e, r) => n(e, t[r])));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The earliest date supported by Firestore timestamps (0001-01-01T00:00:00Z).
    /**
     * A `Timestamp` represents a point in time independent of any time zone or
     * calendar, represented as seconds and fractions of seconds at nanosecond
     * resolution in UTC Epoch time.
     *
     * It is encoded using the Proleptic Gregorian Calendar which extends the
     * Gregorian calendar backwards to year one. It is encoded assuming all minutes
     * are 60 seconds long, i.e. leap seconds are "smeared" so that no leap second
     * table is needed for interpretation. Range is from 0001-01-01T00:00:00Z to
     * 9999-12-31T23:59:59.999999999Z.
     *
     * For examples and further specifications, refer to the
     * {@link https://github.com/google/protobuf/blob/master/src/google/protobuf/timestamp.proto | Timestamp definition}.
     */
    class Timestamp {
        /**
         * Creates a new timestamp.
         *
         * @param seconds - The number of seconds of UTC time since Unix epoch
         *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
         *     9999-12-31T23:59:59Z inclusive.
         * @param nanoseconds - The non-negative fractions of a second at nanosecond
         *     resolution. Negative second values with fractions must still have
         *     non-negative nanoseconds values that count forward in time. Must be
         *     from 0 to 999,999,999 inclusive.
         */
        constructor(
        /**
         * The number of seconds of UTC time since Unix epoch 1970-01-01T00:00:00Z.
         */
        e, 
        /**
         * The fractions of a second at nanosecond resolution.*
         */
        t) {
            if (this.seconds = e, this.nanoseconds = t, t < 0) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
            if (t >= 1e9) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
            if (e < -62135596800) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
            // This will break in the year 10,000.
                    if (e >= 253402300800) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
        }
        /**
         * Creates a new timestamp with the current date, with millisecond precision.
         *
         * @returns a new timestamp representing the current date.
         */    static now() {
            return Timestamp.fromMillis(Date.now());
        }
        /**
         * Creates a new timestamp from the given date.
         *
         * @param date - The date to initialize the `Timestamp` from.
         * @returns A new `Timestamp` representing the same point in time as the given
         *     date.
         */    static fromDate(e) {
            return Timestamp.fromMillis(e.getTime());
        }
        /**
         * Creates a new timestamp from the given number of milliseconds.
         *
         * @param milliseconds - Number of milliseconds since Unix epoch
         *     1970-01-01T00:00:00Z.
         * @returns A new `Timestamp` representing the same point in time as the given
         *     number of milliseconds.
         */    static fromMillis(e) {
            const t = Math.floor(e / 1e3), n = Math.floor(1e6 * (e - 1e3 * t));
            return new Timestamp(t, n);
        }
        /**
         * Converts a `Timestamp` to a JavaScript `Date` object. This conversion
         * causes a loss of precision since `Date` objects only support millisecond
         * precision.
         *
         * @returns JavaScript `Date` object representing the same point in time as
         *     this `Timestamp`, with millisecond precision.
         */    toDate() {
            return new Date(this.toMillis());
        }
        /**
         * Converts a `Timestamp` to a numeric timestamp (in milliseconds since
         * epoch). This operation causes a loss of precision.
         *
         * @returns The point in time corresponding to this timestamp, represented as
         *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
         */    toMillis() {
            return 1e3 * this.seconds + this.nanoseconds / 1e6;
        }
        _compareTo(e) {
            return this.seconds === e.seconds ? __PRIVATE_primitiveComparator(this.nanoseconds, e.nanoseconds) : __PRIVATE_primitiveComparator(this.seconds, e.seconds);
        }
        /**
         * Returns true if this `Timestamp` is equal to the provided one.
         *
         * @param other - The `Timestamp` to compare against.
         * @returns true if this `Timestamp` is equal to the provided one.
         */    isEqual(e) {
            return e.seconds === this.seconds && e.nanoseconds === this.nanoseconds;
        }
        /** Returns a textual representation of this `Timestamp`. */    toString() {
            return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
        }
        /** Returns a JSON-serializable representation of this `Timestamp`. */    toJSON() {
            return {
                seconds: this.seconds,
                nanoseconds: this.nanoseconds
            };
        }
        /**
         * Converts this object to a primitive string, which allows `Timestamp` objects
         * to be compared using the `>`, `<=`, `>=` and `>` operators.
         */    valueOf() {
            // This method returns a string of the form <seconds>.<nanoseconds> where
            // <seconds> is translated to have a non-negative value and both <seconds>
            // and <nanoseconds> are left-padded with zeroes to be a consistent length.
            // Strings with this format then have a lexiographical ordering that matches
            // the expected ordering. The <seconds> translation is done to avoid having
            // a leading negative sign (i.e. a leading '-' character) in its string
            // representation, which would affect its lexiographical ordering.
            const e = this.seconds - -62135596800;
            // Note: Up to 12 decimal digits are required to represent all valid
            // 'seconds' values.
                    return String(e).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A version of a document in Firestore. This corresponds to the version
     * timestamp, such as update_time or read_time.
     */ class SnapshotVersion {
        constructor(e) {
            this.timestamp = e;
        }
        static fromTimestamp(e) {
            return new SnapshotVersion(e);
        }
        static min() {
            return new SnapshotVersion(new Timestamp(0, 0));
        }
        static max() {
            return new SnapshotVersion(new Timestamp(253402300799, 999999999));
        }
        compareTo(e) {
            return this.timestamp._compareTo(e.timestamp);
        }
        isEqual(e) {
            return this.timestamp.isEqual(e.timestamp);
        }
        /** Returns a number representation of the version for use in spec tests. */    toMicroseconds() {
            // Convert to microseconds.
            return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
        }
        toString() {
            return "SnapshotVersion(" + this.timestamp.toString() + ")";
        }
        toTimestamp() {
            return this.timestamp;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Path represents an ordered sequence of string segments.
     */
    class BasePath {
        constructor(e, t, n) {
            void 0 === t ? t = 0 : t > e.length && fail(), void 0 === n ? n = e.length - t : n > e.length - t && fail(), 
            this.segments = e, this.offset = t, this.len = n;
        }
        get length() {
            return this.len;
        }
        isEqual(e) {
            return 0 === BasePath.comparator(this, e);
        }
        child(e) {
            const t = this.segments.slice(this.offset, this.limit());
            return e instanceof BasePath ? e.forEach((e => {
                t.push(e);
            })) : t.push(e), this.construct(t);
        }
        /** The index of one past the last segment of the path. */    limit() {
            return this.offset + this.length;
        }
        popFirst(e) {
            return e = void 0 === e ? 1 : e, this.construct(this.segments, this.offset + e, this.length - e);
        }
        popLast() {
            return this.construct(this.segments, this.offset, this.length - 1);
        }
        firstSegment() {
            return this.segments[this.offset];
        }
        lastSegment() {
            return this.get(this.length - 1);
        }
        get(e) {
            return this.segments[this.offset + e];
        }
        isEmpty() {
            return 0 === this.length;
        }
        isPrefixOf(e) {
            if (e.length < this.length) return !1;
            for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
            return !0;
        }
        isImmediateParentOf(e) {
            if (this.length + 1 !== e.length) return !1;
            for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
            return !0;
        }
        forEach(e) {
            for (let t = this.offset, n = this.limit(); t < n; t++) e(this.segments[t]);
        }
        toArray() {
            return this.segments.slice(this.offset, this.limit());
        }
        static comparator(e, t) {
            const n = Math.min(e.length, t.length);
            for (let r = 0; r < n; r++) {
                const n = e.get(r), i = t.get(r);
                if (n < i) return -1;
                if (n > i) return 1;
            }
            return e.length < t.length ? -1 : e.length > t.length ? 1 : 0;
        }
    }

    /**
     * A slash-separated path for navigating resources (documents and collections)
     * within Firestore.
     *
     * @internal
     */ class ResourcePath extends BasePath {
        construct(e, t, n) {
            return new ResourcePath(e, t, n);
        }
        canonicalString() {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            return this.toArray().join("/");
        }
        toString() {
            return this.canonicalString();
        }
        /**
         * Creates a resource path from the given slash-delimited string. If multiple
         * arguments are provided, all components are combined. Leading and trailing
         * slashes from all components are ignored.
         */    static fromString(...e) {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            const t = [];
            for (const n of e) {
                if (n.indexOf("//") >= 0) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid segment (${n}). Paths must not contain // in them.`);
                // Strip leading and traling slashed.
                            t.push(...n.split("/").filter((e => e.length > 0)));
            }
            return new ResourcePath(t);
        }
        static emptyPath() {
            return new ResourcePath([]);
        }
    }

    const C = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

    /**
     * A dot-separated path for navigating sub-objects within a document.
     * @internal
     */ class FieldPath$1 extends BasePath {
        construct(e, t, n) {
            return new FieldPath$1(e, t, n);
        }
        /**
         * Returns true if the string could be used as a segment in a field path
         * without escaping.
         */    static isValidIdentifier(e) {
            return C.test(e);
        }
        canonicalString() {
            return this.toArray().map((e => (e = e.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), 
            FieldPath$1.isValidIdentifier(e) || (e = "`" + e + "`"), e))).join(".");
        }
        toString() {
            return this.canonicalString();
        }
        /**
         * Returns true if this field references the key of a document.
         */    isKeyField() {
            return 1 === this.length && "__name__" === this.get(0);
        }
        /**
         * The field designating the key of a document.
         */    static keyField() {
            return new FieldPath$1([ "__name__" ]);
        }
        /**
         * Parses a field string from the given server-formatted string.
         *
         * - Splitting the empty string is not allowed (for now at least).
         * - Empty segments within the string (e.g. if there are two consecutive
         *   separators) are not allowed.
         *
         * TODO(b/37244157): we should make this more strict. Right now, it allows
         * non-identifier path components, even if they aren't escaped.
         */    static fromServerFormat(e) {
            const t = [];
            let n = "", r = 0;
            const __PRIVATE_addCurrentSegment = () => {
                if (0 === n.length) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
                t.push(n), n = "";
            };
            let i = !1;
            for (;r < e.length; ) {
                const t = e[r];
                if ("\\" === t) {
                    if (r + 1 === e.length) throw new FirestoreError(D.INVALID_ARGUMENT, "Path has trailing escape character: " + e);
                    const t = e[r + 1];
                    if ("\\" !== t && "." !== t && "`" !== t) throw new FirestoreError(D.INVALID_ARGUMENT, "Path has invalid escape sequence: " + e);
                    n += t, r += 2;
                } else "`" === t ? (i = !i, r++) : "." !== t || i ? (n += t, r++) : (__PRIVATE_addCurrentSegment(), 
                r++);
            }
            if (__PRIVATE_addCurrentSegment(), i) throw new FirestoreError(D.INVALID_ARGUMENT, "Unterminated ` in path: " + e);
            return new FieldPath$1(t);
        }
        static emptyPath() {
            return new FieldPath$1([]);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */ class DocumentKey {
        constructor(e) {
            this.path = e;
        }
        static fromPath(e) {
            return new DocumentKey(ResourcePath.fromString(e));
        }
        static fromName(e) {
            return new DocumentKey(ResourcePath.fromString(e).popFirst(5));
        }
        static empty() {
            return new DocumentKey(ResourcePath.emptyPath());
        }
        get collectionGroup() {
            return this.path.popLast().lastSegment();
        }
        /** Returns true if the document is in the specified collectionId. */    hasCollectionId(e) {
            return this.path.length >= 2 && this.path.get(this.path.length - 2) === e;
        }
        /** Returns the collection group (i.e. the name of the parent collection) for this key. */    getCollectionGroup() {
            return this.path.get(this.path.length - 2);
        }
        /** Returns the fully qualified path to the parent collection. */    getCollectionPath() {
            return this.path.popLast();
        }
        isEqual(e) {
            return null !== e && 0 === ResourcePath.comparator(this.path, e.path);
        }
        toString() {
            return this.path.toString();
        }
        static comparator(e, t) {
            return ResourcePath.comparator(e.path, t.path);
        }
        static isDocumentKey(e) {
            return e.length % 2 == 0;
        }
        /**
         * Creates and returns a new document key with the given segments.
         *
         * @param segments - The segments of the path to the document
         * @returns A new instance of DocumentKey
         */    static fromSegments(e) {
            return new DocumentKey(new ResourcePath(e.slice()));
        }
    }

    /**
     * Creates an offset that matches all documents with a read time higher than
     * `readTime`.
     */ function __PRIVATE_newIndexOffsetSuccessorFromReadTime(e, t) {
        // We want to create an offset that matches all documents with a read time
        // greater than the provided read time. To do so, we technically need to
        // create an offset for `(readTime, MAX_DOCUMENT_KEY)`. While we could use
        // Unicode codepoints to generate MAX_DOCUMENT_KEY, it is much easier to use
        // `(readTime + 1, DocumentKey.empty())` since `> DocumentKey.empty()` matches
        // all valid document IDs.
        const n = e.toTimestamp().seconds, r = e.toTimestamp().nanoseconds + 1, i = SnapshotVersion.fromTimestamp(1e9 === r ? new Timestamp(n + 1, 0) : new Timestamp(n, r));
        return new IndexOffset(i, DocumentKey.empty(), t);
    }

    /** Creates a new offset based on the provided document. */ function __PRIVATE_newIndexOffsetFromDocument(e) {
        return new IndexOffset(e.readTime, e.key, -1);
    }

    /**
     * Stores the latest read time, document and batch ID that were processed for an
     * index.
     */ class IndexOffset {
        constructor(
        /**
         * The latest read time version that has been indexed by Firestore for this
         * field index.
         */
        e, 
        /**
         * The key of the last document that was indexed for this query. Use
         * `DocumentKey.empty()` if no document has been indexed.
         */
        t, 
        /*
         * The largest mutation batch id that's been processed by Firestore.
         */
        n) {
            this.readTime = e, this.documentKey = t, this.largestBatchId = n;
        }
        /** Returns an offset that sorts before all regular offsets. */    static min() {
            return new IndexOffset(SnapshotVersion.min(), DocumentKey.empty(), -1);
        }
        /** Returns an offset that sorts after all regular offsets. */    static max() {
            return new IndexOffset(SnapshotVersion.max(), DocumentKey.empty(), -1);
        }
    }

    function __PRIVATE_indexOffsetComparator(e, t) {
        let n = e.readTime.compareTo(t.readTime);
        return 0 !== n ? n : (n = DocumentKey.comparator(e.documentKey, t.documentKey), 
        0 !== n ? n : __PRIVATE_primitiveComparator(e.largestBatchId, t.largestBatchId));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const v = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";

    /**
     * A base class representing a persistence transaction, encapsulating both the
     * transaction's sequence numbers as well as a list of onCommitted listeners.
     *
     * When you call Persistence.runTransaction(), it will create a transaction and
     * pass it to your callback. You then pass it to any method that operates
     * on persistence.
     */ class PersistenceTransaction {
        constructor() {
            this.onCommittedListeners = [];
        }
        addOnCommittedListener(e) {
            this.onCommittedListeners.push(e);
        }
        raiseOnCommittedEvent() {
            this.onCommittedListeners.forEach((e => e()));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Verifies the error thrown by a LocalStore operation. If a LocalStore
     * operation fails because the primary lease has been taken by another client,
     * we ignore the error (the persistence layer will immediately call
     * `applyPrimaryLease` to propagate the primary state change). All other errors
     * are re-thrown.
     *
     * @param err - An error returned by a LocalStore operation.
     * @returns A Promise that resolves after we recovered, or the original error.
     */ async function __PRIVATE_ignoreIfPrimaryLeaseLoss(e) {
        if (e.code !== D.FAILED_PRECONDITION || e.message !== v) throw e;
        __PRIVATE_logDebug("LocalStore", "Unexpectedly lost primary lease");
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * PersistencePromise is essentially a re-implementation of Promise except
     * it has a .next() method instead of .then() and .next() and .catch() callbacks
     * are executed synchronously when a PersistencePromise resolves rather than
     * asynchronously (Promise implementations use setImmediate() or similar).
     *
     * This is necessary to interoperate with IndexedDB which will automatically
     * commit transactions if control is returned to the event loop without
     * synchronously initiating another operation on the transaction.
     *
     * NOTE: .then() and .catch() only allow a single consumer, unlike normal
     * Promises.
     */ class PersistencePromise {
        constructor(e) {
            // NOTE: next/catchCallback will always point to our own wrapper functions,
            // not the user's raw next() or catch() callbacks.
            this.nextCallback = null, this.catchCallback = null, 
            // When the operation resolves, we'll set result or error and mark isDone.
            this.result = void 0, this.error = void 0, this.isDone = !1, 
            // Set to true when .then() or .catch() are called and prevents additional
            // chaining.
            this.callbackAttached = !1, e((e => {
                this.isDone = !0, this.result = e, this.nextCallback && 
                // value should be defined unless T is Void, but we can't express
                // that in the type system.
                this.nextCallback(e);
            }), (e => {
                this.isDone = !0, this.error = e, this.catchCallback && this.catchCallback(e);
            }));
        }
        catch(e) {
            return this.next(void 0, e);
        }
        next(e, t) {
            return this.callbackAttached && fail(), this.callbackAttached = !0, this.isDone ? this.error ? this.wrapFailure(t, this.error) : this.wrapSuccess(e, this.result) : new PersistencePromise(((n, r) => {
                this.nextCallback = t => {
                    this.wrapSuccess(e, t).next(n, r);
                }, this.catchCallback = e => {
                    this.wrapFailure(t, e).next(n, r);
                };
            }));
        }
        toPromise() {
            return new Promise(((e, t) => {
                this.next(e, t);
            }));
        }
        wrapUserFunction(e) {
            try {
                const t = e();
                return t instanceof PersistencePromise ? t : PersistencePromise.resolve(t);
            } catch (e) {
                return PersistencePromise.reject(e);
            }
        }
        wrapSuccess(e, t) {
            return e ? this.wrapUserFunction((() => e(t))) : PersistencePromise.resolve(t);
        }
        wrapFailure(e, t) {
            return e ? this.wrapUserFunction((() => e(t))) : PersistencePromise.reject(t);
        }
        static resolve(e) {
            return new PersistencePromise(((t, n) => {
                t(e);
            }));
        }
        static reject(e) {
            return new PersistencePromise(((t, n) => {
                n(e);
            }));
        }
        static waitFor(
        // Accept all Promise types in waitFor().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e) {
            return new PersistencePromise(((t, n) => {
                let r = 0, i = 0, s = !1;
                e.forEach((e => {
                    ++r, e.next((() => {
                        ++i, s && i === r && t();
                    }), (e => n(e)));
                })), s = !0, i === r && t();
            }));
        }
        /**
         * Given an array of predicate functions that asynchronously evaluate to a
         * boolean, implements a short-circuiting `or` between the results. Predicates
         * will be evaluated until one of them returns `true`, then stop. The final
         * result will be whether any of them returned `true`.
         */    static or(e) {
            let t = PersistencePromise.resolve(!1);
            for (const n of e) t = t.next((e => e ? PersistencePromise.resolve(e) : n()));
            return t;
        }
        static forEach(e, t) {
            const n = [];
            return e.forEach(((e, r) => {
                n.push(t.call(this, e, r));
            })), this.waitFor(n);
        }
        /**
         * Concurrently map all array elements through asynchronous function.
         */    static mapArray(e, t) {
            return new PersistencePromise(((n, r) => {
                const i = e.length, s = new Array(i);
                let o = 0;
                for (let _ = 0; _ < i; _++) {
                    const a = _;
                    t(e[a]).next((e => {
                        s[a] = e, ++o, o === i && n(s);
                    }), (e => r(e)));
                }
            }));
        }
        /**
         * An alternative to recursive PersistencePromise calls, that avoids
         * potential memory problems from unbounded chains of promises.
         *
         * The `action` will be called repeatedly while `condition` is true.
         */    static doWhile(e, t) {
            return new PersistencePromise(((n, r) => {
                const process = () => {
                    !0 === e() ? t().next((() => {
                        process();
                    }), r) : n();
                };
                process();
            }));
        }
    }

    /** Verifies whether `e` is an IndexedDbTransactionError. */ function __PRIVATE_isIndexedDbTransactionError(e) {
        // Use name equality, as instanceof checks on errors don't work with errors
        // that wrap other errors.
        return "IndexedDbTransactionError" === e.name;
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * `ListenSequence` is a monotonic sequence. It is initialized with a minimum value to
     * exceed. All subsequent calls to next will return increasing values. If provided with a
     * `SequenceNumberSyncer`, it will additionally bump its next value when told of a new value, as
     * well as write out sequence numbers that it produces via `next()`.
     */ class __PRIVATE_ListenSequence {
        constructor(e, t) {
            this.previousValue = e, t && (t.sequenceNumberHandler = e => this.oe(e), this._e = e => t.writeSequenceNumber(e));
        }
        oe(e) {
            return this.previousValue = Math.max(e, this.previousValue), this.previousValue;
        }
        next() {
            const e = ++this.previousValue;
            return this._e && this._e(e), e;
        }
    }

    __PRIVATE_ListenSequence.ae = -1;

    /**
     * Returns whether a variable is either undefined or null.
     */
    function __PRIVATE_isNullOrUndefined(e) {
        return null == e;
    }

    /** Returns whether the value represents -0. */ function __PRIVATE_isNegativeZero(e) {
        // Detect if the value is -0.0. Based on polyfill from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
        return 0 === e && 1 / e == -1 / 0;
    }

    /**
     * Returns whether a value is an integer and in the safe integer range
     * @param value - The value to test for being an integer and in the safe range
     */ function isSafeInteger(e) {
        return "number" == typeof e && Number.isInteger(e) && !__PRIVATE_isNegativeZero(e) && e <= Number.MAX_SAFE_INTEGER && e >= Number.MIN_SAFE_INTEGER;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function __PRIVATE_objectSize(e) {
        let t = 0;
        for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t++;
        return t;
    }

    function forEach(e, t) {
        for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t(n, e[n]);
    }

    function isEmpty(e) {
        for (const t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
        return !0;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // An immutable sorted map implementation, based on a Left-leaning Red-Black
    // tree.
    class SortedMap {
        constructor(e, t) {
            this.comparator = e, this.root = t || LLRBNode.EMPTY;
        }
        // Returns a copy of the map, with the specified key/value added or replaced.
        insert(e, t) {
            return new SortedMap(this.comparator, this.root.insert(e, t, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
        }
        // Returns a copy of the map, with the specified key removed.
        remove(e) {
            return new SortedMap(this.comparator, this.root.remove(e, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
        }
        // Returns the value of the node with the given key, or null.
        get(e) {
            let t = this.root;
            for (;!t.isEmpty(); ) {
                const n = this.comparator(e, t.key);
                if (0 === n) return t.value;
                n < 0 ? t = t.left : n > 0 && (t = t.right);
            }
            return null;
        }
        // Returns the index of the element in this sorted map, or -1 if it doesn't
        // exist.
        indexOf(e) {
            // Number of nodes that were pruned when descending right
            let t = 0, n = this.root;
            for (;!n.isEmpty(); ) {
                const r = this.comparator(e, n.key);
                if (0 === r) return t + n.left.size;
                r < 0 ? n = n.left : (
                // Count all nodes left of the node plus the node itself
                t += n.left.size + 1, n = n.right);
            }
            // Node not found
                    return -1;
        }
        isEmpty() {
            return this.root.isEmpty();
        }
        // Returns the total number of nodes in the map.
        get size() {
            return this.root.size;
        }
        // Returns the minimum key in the map.
        minKey() {
            return this.root.minKey();
        }
        // Returns the maximum key in the map.
        maxKey() {
            return this.root.maxKey();
        }
        // Traverses the map in key order and calls the specified action function
        // for each key/value pair. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        inorderTraversal(e) {
            return this.root.inorderTraversal(e);
        }
        forEach(e) {
            this.inorderTraversal(((t, n) => (e(t, n), !1)));
        }
        toString() {
            const e = [];
            return this.inorderTraversal(((t, n) => (e.push(`${t}:${n}`), !1))), `{${e.join(", ")}}`;
        }
        // Traverses the map in reverse key order and calls the specified action
        // function for each key/value pair. If action returns true, traversal is
        // aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        reverseTraversal(e) {
            return this.root.reverseTraversal(e);
        }
        // Returns an iterator over the SortedMap.
        getIterator() {
            return new SortedMapIterator(this.root, null, this.comparator, !1);
        }
        getIteratorFrom(e) {
            return new SortedMapIterator(this.root, e, this.comparator, !1);
        }
        getReverseIterator() {
            return new SortedMapIterator(this.root, null, this.comparator, !0);
        }
        getReverseIteratorFrom(e) {
            return new SortedMapIterator(this.root, e, this.comparator, !0);
        }
    }

     // end SortedMap
    // An iterator over an LLRBNode.
    class SortedMapIterator {
        constructor(e, t, n, r) {
            this.isReverse = r, this.nodeStack = [];
            let i = 1;
            for (;!e.isEmpty(); ) if (i = t ? n(e.key, t) : 1, 
            // flip the comparison if we're going in reverse
            t && r && (i *= -1), i < 0) 
            // This node is less than our start key. ignore it
            e = this.isReverse ? e.left : e.right; else {
                if (0 === i) {
                    // This node is exactly equal to our start key. Push it on the stack,
                    // but stop iterating;
                    this.nodeStack.push(e);
                    break;
                }
                // This node is greater than our start key, add it to the stack and move
                // to the next one
                this.nodeStack.push(e), e = this.isReverse ? e.right : e.left;
            }
        }
        getNext() {
            let e = this.nodeStack.pop();
            const t = {
                key: e.key,
                value: e.value
            };
            if (this.isReverse) for (e = e.left; !e.isEmpty(); ) this.nodeStack.push(e), e = e.right; else for (e = e.right; !e.isEmpty(); ) this.nodeStack.push(e), 
            e = e.left;
            return t;
        }
        hasNext() {
            return this.nodeStack.length > 0;
        }
        peek() {
            if (0 === this.nodeStack.length) return null;
            const e = this.nodeStack[this.nodeStack.length - 1];
            return {
                key: e.key,
                value: e.value
            };
        }
    }

     // end SortedMapIterator
    // Represents a node in a Left-leaning Red-Black tree.
    class LLRBNode {
        constructor(e, t, n, r, i) {
            this.key = e, this.value = t, this.color = null != n ? n : LLRBNode.RED, this.left = null != r ? r : LLRBNode.EMPTY, 
            this.right = null != i ? i : LLRBNode.EMPTY, this.size = this.left.size + 1 + this.right.size;
        }
        // Returns a copy of the current node, optionally replacing pieces of it.
        copy(e, t, n, r, i) {
            return new LLRBNode(null != e ? e : this.key, null != t ? t : this.value, null != n ? n : this.color, null != r ? r : this.left, null != i ? i : this.right);
        }
        isEmpty() {
            return !1;
        }
        // Traverses the tree in key order and calls the specified action function
        // for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        inorderTraversal(e) {
            return this.left.inorderTraversal(e) || e(this.key, this.value) || this.right.inorderTraversal(e);
        }
        // Traverses the tree in reverse key order and calls the specified action
        // function for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        reverseTraversal(e) {
            return this.right.reverseTraversal(e) || e(this.key, this.value) || this.left.reverseTraversal(e);
        }
        // Returns the minimum node in the tree.
        min() {
            return this.left.isEmpty() ? this : this.left.min();
        }
        // Returns the maximum key in the tree.
        minKey() {
            return this.min().key;
        }
        // Returns the maximum key in the tree.
        maxKey() {
            return this.right.isEmpty() ? this.key : this.right.maxKey();
        }
        // Returns new tree, with the key/value added.
        insert(e, t, n) {
            let r = this;
            const i = n(e, r.key);
            return r = i < 0 ? r.copy(null, null, null, r.left.insert(e, t, n), null) : 0 === i ? r.copy(null, t, null, null, null) : r.copy(null, null, null, null, r.right.insert(e, t, n)), 
            r.fixUp();
        }
        removeMin() {
            if (this.left.isEmpty()) return LLRBNode.EMPTY;
            let e = this;
            return e.left.isRed() || e.left.left.isRed() || (e = e.moveRedLeft()), e = e.copy(null, null, null, e.left.removeMin(), null), 
            e.fixUp();
        }
        // Returns new tree, with the specified item removed.
        remove(e, t) {
            let n, r = this;
            if (t(e, r.key) < 0) r.left.isEmpty() || r.left.isRed() || r.left.left.isRed() || (r = r.moveRedLeft()), 
            r = r.copy(null, null, null, r.left.remove(e, t), null); else {
                if (r.left.isRed() && (r = r.rotateRight()), r.right.isEmpty() || r.right.isRed() || r.right.left.isRed() || (r = r.moveRedRight()), 
                0 === t(e, r.key)) {
                    if (r.right.isEmpty()) return LLRBNode.EMPTY;
                    n = r.right.min(), r = r.copy(n.key, n.value, null, null, r.right.removeMin());
                }
                r = r.copy(null, null, null, null, r.right.remove(e, t));
            }
            return r.fixUp();
        }
        isRed() {
            return this.color;
        }
        // Returns new tree after performing any needed rotations.
        fixUp() {
            let e = this;
            return e.right.isRed() && !e.left.isRed() && (e = e.rotateLeft()), e.left.isRed() && e.left.left.isRed() && (e = e.rotateRight()), 
            e.left.isRed() && e.right.isRed() && (e = e.colorFlip()), e;
        }
        moveRedLeft() {
            let e = this.colorFlip();
            return e.right.left.isRed() && (e = e.copy(null, null, null, null, e.right.rotateRight()), 
            e = e.rotateLeft(), e = e.colorFlip()), e;
        }
        moveRedRight() {
            let e = this.colorFlip();
            return e.left.left.isRed() && (e = e.rotateRight(), e = e.colorFlip()), e;
        }
        rotateLeft() {
            const e = this.copy(null, null, LLRBNode.RED, null, this.right.left);
            return this.right.copy(null, null, this.color, e, null);
        }
        rotateRight() {
            const e = this.copy(null, null, LLRBNode.RED, this.left.right, null);
            return this.left.copy(null, null, this.color, null, e);
        }
        colorFlip() {
            const e = this.left.copy(null, null, !this.left.color, null, null), t = this.right.copy(null, null, !this.right.color, null, null);
            return this.copy(null, null, !this.color, e, t);
        }
        // For testing.
        checkMaxDepth() {
            const e = this.check();
            return Math.pow(2, e) <= this.size + 1;
        }
        // In a balanced RB tree, the black-depth (number of black nodes) from root to
        // leaves is equal on both sides.  This function verifies that or asserts.
        check() {
            if (this.isRed() && this.left.isRed()) throw fail();
            if (this.right.isRed()) throw fail();
            const e = this.left.check();
            if (e !== this.right.check()) throw fail();
            return e + (this.isRed() ? 0 : 1);
        }
    }

     // end LLRBNode
    // Empty node is shared between all LLRB trees.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LLRBNode.EMPTY = null, LLRBNode.RED = !0, LLRBNode.BLACK = !1;

    // end LLRBEmptyNode
    LLRBNode.EMPTY = new 
    // Represents an empty node (a leaf node in the Red-Black Tree).
    class LLRBEmptyNode {
        constructor() {
            this.size = 0;
        }
        get key() {
            throw fail();
        }
        get value() {
            throw fail();
        }
        get color() {
            throw fail();
        }
        get left() {
            throw fail();
        }
        get right() {
            throw fail();
        }
        // Returns a copy of the current node.
        copy(e, t, n, r, i) {
            return this;
        }
        // Returns a copy of the tree, with the specified key/value added.
        insert(e, t, n) {
            return new LLRBNode(e, t);
        }
        // Returns a copy of the tree, with the specified key removed.
        remove(e, t) {
            return this;
        }
        isEmpty() {
            return !0;
        }
        inorderTraversal(e) {
            return !1;
        }
        reverseTraversal(e) {
            return !1;
        }
        minKey() {
            return null;
        }
        maxKey() {
            return null;
        }
        isRed() {
            return !1;
        }
        // For testing.
        checkMaxDepth() {
            return !0;
        }
        check() {
            return 0;
        }
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * SortedSet is an immutable (copy-on-write) collection that holds elements
     * in order specified by the provided comparator.
     *
     * NOTE: if provided comparator returns 0 for two elements, we consider them to
     * be equal!
     */
    class SortedSet {
        constructor(e) {
            this.comparator = e, this.data = new SortedMap(this.comparator);
        }
        has(e) {
            return null !== this.data.get(e);
        }
        first() {
            return this.data.minKey();
        }
        last() {
            return this.data.maxKey();
        }
        get size() {
            return this.data.size;
        }
        indexOf(e) {
            return this.data.indexOf(e);
        }
        /** Iterates elements in order defined by "comparator" */    forEach(e) {
            this.data.inorderTraversal(((t, n) => (e(t), !1)));
        }
        /** Iterates over `elem`s such that: range[0] &lt;= elem &lt; range[1]. */    forEachInRange(e, t) {
            const n = this.data.getIteratorFrom(e[0]);
            for (;n.hasNext(); ) {
                const r = n.getNext();
                if (this.comparator(r.key, e[1]) >= 0) return;
                t(r.key);
            }
        }
        /**
         * Iterates over `elem`s such that: start &lt;= elem until false is returned.
         */    forEachWhile(e, t) {
            let n;
            for (n = void 0 !== t ? this.data.getIteratorFrom(t) : this.data.getIterator(); n.hasNext(); ) {
                if (!e(n.getNext().key)) return;
            }
        }
        /** Finds the least element greater than or equal to `elem`. */    firstAfterOrEqual(e) {
            const t = this.data.getIteratorFrom(e);
            return t.hasNext() ? t.getNext().key : null;
        }
        getIterator() {
            return new SortedSetIterator(this.data.getIterator());
        }
        getIteratorFrom(e) {
            return new SortedSetIterator(this.data.getIteratorFrom(e));
        }
        /** Inserts or updates an element */    add(e) {
            return this.copy(this.data.remove(e).insert(e, !0));
        }
        /** Deletes an element */    delete(e) {
            return this.has(e) ? this.copy(this.data.remove(e)) : this;
        }
        isEmpty() {
            return this.data.isEmpty();
        }
        unionWith(e) {
            let t = this;
            // Make sure `result` always refers to the larger one of the two sets.
                    return t.size < e.size && (t = e, e = this), e.forEach((e => {
                t = t.add(e);
            })), t;
        }
        isEqual(e) {
            if (!(e instanceof SortedSet)) return !1;
            if (this.size !== e.size) return !1;
            const t = this.data.getIterator(), n = e.data.getIterator();
            for (;t.hasNext(); ) {
                const e = t.getNext().key, r = n.getNext().key;
                if (0 !== this.comparator(e, r)) return !1;
            }
            return !0;
        }
        toArray() {
            const e = [];
            return this.forEach((t => {
                e.push(t);
            })), e;
        }
        toString() {
            const e = [];
            return this.forEach((t => e.push(t))), "SortedSet(" + e.toString() + ")";
        }
        copy(e) {
            const t = new SortedSet(this.comparator);
            return t.data = e, t;
        }
    }

    class SortedSetIterator {
        constructor(e) {
            this.iter = e;
        }
        getNext() {
            return this.iter.getNext().key;
        }
        hasNext() {
            return this.iter.hasNext();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a set of fields that can be used to partially patch a document.
     * FieldMask is used in conjunction with ObjectValue.
     * Examples:
     *   foo - Overwrites foo entirely with the provided value. If foo is not
     *         present in the companion ObjectValue, the field is deleted.
     *   foo.bar - Overwrites only the field bar of the object foo.
     *             If foo is not an object, foo is replaced with an object
     *             containing foo
     */ class FieldMask {
        constructor(e) {
            this.fields = e, 
            // TODO(dimond): validation of FieldMask
            // Sort the field mask to support `FieldMask.isEqual()` and assert below.
            e.sort(FieldPath$1.comparator);
        }
        static empty() {
            return new FieldMask([]);
        }
        /**
         * Returns a new FieldMask object that is the result of adding all the given
         * fields paths to this field mask.
         */    unionWith(e) {
            let t = new SortedSet(FieldPath$1.comparator);
            for (const e of this.fields) t = t.add(e);
            for (const n of e) t = t.add(n);
            return new FieldMask(t.toArray());
        }
        /**
         * Verifies that `fieldPath` is included by at least one field in this field
         * mask.
         *
         * This is an O(n) operation, where `n` is the size of the field mask.
         */    covers(e) {
            for (const t of this.fields) if (t.isPrefixOf(e)) return !0;
            return !1;
        }
        isEqual(e) {
            return __PRIVATE_arrayEquals(this.fields, e.fields, ((e, t) => e.isEqual(t)));
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An error encountered while decoding base64 string.
     */ class __PRIVATE_Base64DecodeError extends Error {
        constructor() {
            super(...arguments), this.name = "Base64DecodeError";
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Immutable class that represents a "proto" byte string.
     *
     * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
     * sent on the wire. This class abstracts away this differentiation by holding
     * the proto byte string in a common class that must be converted into a string
     * before being sent as a proto.
     * @internal
     */ class ByteString {
        constructor(e) {
            this.binaryString = e;
        }
        static fromBase64String(e) {
            const t = function __PRIVATE_decodeBase64(e) {
                try {
                    return atob(e);
                } catch (e) {
                    // Check that `DOMException` is defined before using it to avoid
                    // "ReferenceError: Property 'DOMException' doesn't exist" in react-native.
                    // (https://github.com/firebase/firebase-js-sdk/issues/7115)
                    throw "undefined" != typeof DOMException && e instanceof DOMException ? new __PRIVATE_Base64DecodeError("Invalid base64 string: " + e) : e;
                }
            }
            /** Converts a binary string to a Base64 encoded string. */ (e);
            return new ByteString(t);
        }
        static fromUint8Array(e) {
            // TODO(indexing); Remove the copy of the byte string here as this method
            // is frequently called during indexing.
            const t = 
            /**
     * Helper function to convert an Uint8array to a binary string.
     */
            function __PRIVATE_binaryStringFromUint8Array(e) {
                let t = "";
                for (let n = 0; n < e.length; ++n) t += String.fromCharCode(e[n]);
                return t;
            }
            /**
     * Helper function to convert a binary string to an Uint8Array.
     */ (e);
            return new ByteString(t);
        }
        [Symbol.iterator]() {
            let e = 0;
            return {
                next: () => e < this.binaryString.length ? {
                    value: this.binaryString.charCodeAt(e++),
                    done: !1
                } : {
                    value: void 0,
                    done: !0
                }
            };
        }
        toBase64() {
            return function __PRIVATE_encodeBase64(e) {
                return btoa(e);
            }(this.binaryString);
        }
        toUint8Array() {
            return function __PRIVATE_uint8ArrayFromBinaryString(e) {
                const t = new Uint8Array(e.length);
                for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
                return t;
            }
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            // A RegExp matching ISO 8601 UTC timestamps with optional fraction.
            (this.binaryString);
        }
        approximateByteSize() {
            return 2 * this.binaryString.length;
        }
        compareTo(e) {
            return __PRIVATE_primitiveComparator(this.binaryString, e.binaryString);
        }
        isEqual(e) {
            return this.binaryString === e.binaryString;
        }
    }

    ByteString.EMPTY_BYTE_STRING = new ByteString("");

    const ee = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

    /**
     * Converts the possible Proto values for a timestamp value into a "seconds and
     * nanos" representation.
     */ function __PRIVATE_normalizeTimestamp(e) {
        // The json interface (for the browser) will return an iso timestamp string,
        // while the proto js library (for node) will return a
        // google.protobuf.Timestamp instance.
        if (__PRIVATE_hardAssert(!!e), "string" == typeof e) {
            // The date string can have higher precision (nanos) than the Date class
            // (millis), so we do some custom parsing here.
            // Parse the nanos right out of the string.
            let t = 0;
            const n = ee.exec(e);
            if (__PRIVATE_hardAssert(!!n), n[1]) {
                // Pad the fraction out to 9 digits (nanos).
                let e = n[1];
                e = (e + "000000000").substr(0, 9), t = Number(e);
            }
            // Parse the date to get the seconds.
                    const r = new Date(e);
            return {
                seconds: Math.floor(r.getTime() / 1e3),
                nanos: t
            };
        }
        return {
            seconds: __PRIVATE_normalizeNumber(e.seconds),
            nanos: __PRIVATE_normalizeNumber(e.nanos)
        };
    }

    /**
     * Converts the possible Proto types for numbers into a JavaScript number.
     * Returns 0 if the value is not numeric.
     */ function __PRIVATE_normalizeNumber(e) {
        // TODO(bjornick): Handle int64 greater than 53 bits.
        return "number" == typeof e ? e : "string" == typeof e ? Number(e) : 0;
    }

    /** Converts the possible Proto types for Blobs into a ByteString. */ function __PRIVATE_normalizeByteString(e) {
        return "string" == typeof e ? ByteString.fromBase64String(e) : ByteString.fromUint8Array(e);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a locally-applied ServerTimestamp.
     *
     * Server Timestamps are backed by MapValues that contain an internal field
     * `__type__` with a value of `server_timestamp`. The previous value and local
     * write time are stored in its `__previous_value__` and `__local_write_time__`
     * fields respectively.
     *
     * Notes:
     * - ServerTimestampValue instances are created as the result of applying a
     *   transform. They can only exist in the local view of a document. Therefore
     *   they do not need to be parsed or serialized.
     * - When evaluated locally (e.g. for snapshot.data()), they by default
     *   evaluate to `null`. This behavior can be configured by passing custom
     *   FieldValueOptions to value().
     * - With respect to other ServerTimestampValues, they sort by their
     *   localWriteTime.
     */ function __PRIVATE_isServerTimestamp(e) {
        var t, n;
        return "server_timestamp" === (null === (n = ((null === (t = null == e ? void 0 : e.mapValue) || void 0 === t ? void 0 : t.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
    }

    /**
     * Creates a new ServerTimestamp proto value (using the internal format).
     */
    /**
     * Returns the value of the field before this ServerTimestamp was set.
     *
     * Preserving the previous values allows the user to display the last resoled
     * value until the backend responds with the timestamp.
     */
    function __PRIVATE_getPreviousValue(e) {
        const t = e.mapValue.fields.__previous_value__;
        return __PRIVATE_isServerTimestamp(t) ? __PRIVATE_getPreviousValue(t) : t;
    }

    /**
     * Returns the local time at which this timestamp was first set.
     */ function __PRIVATE_getLocalWriteTime(e) {
        const t = __PRIVATE_normalizeTimestamp(e.mapValue.fields.__local_write_time__.timestampValue);
        return new Timestamp(t.seconds, t.nanos);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class DatabaseInfo {
        /**
         * Constructs a DatabaseInfo using the provided host, databaseId and
         * persistenceKey.
         *
         * @param databaseId - The database to use.
         * @param appId - The Firebase App Id.
         * @param persistenceKey - A unique identifier for this Firestore's local
         * storage (used in conjunction with the databaseId).
         * @param host - The Firestore backend host to connect to.
         * @param ssl - Whether to use SSL when connecting.
         * @param forceLongPolling - Whether to use the forceLongPolling option
         * when using WebChannel as the network transport.
         * @param autoDetectLongPolling - Whether to use the detectBufferingProxy
         * option when using WebChannel as the network transport.
         * @param longPollingOptions Options that configure long-polling.
         * @param useFetchStreams Whether to use the Fetch API instead of
         * XMLHTTPRequest
         */
        constructor(e, t, n, r, i, s, o, _, a) {
            this.databaseId = e, this.appId = t, this.persistenceKey = n, this.host = r, this.ssl = i, 
            this.forceLongPolling = s, this.autoDetectLongPolling = o, this.longPollingOptions = _, 
            this.useFetchStreams = a;
        }
    }

    /** The default database name for a project. */
    /**
     * Represents the database ID a Firestore client is associated with.
     * @internal
     */
    class DatabaseId {
        constructor(e, t) {
            this.projectId = e, this.database = t || "(default)";
        }
        static empty() {
            return new DatabaseId("", "");
        }
        get isDefaultDatabase() {
            return "(default)" === this.database;
        }
        isEqual(e) {
            return e instanceof DatabaseId && e.projectId === this.projectId && e.database === this.database;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const te = {
        mapValue: {
            fields: {
                __type__: {
                    stringValue: "__max__"
                }
            }
        }
    };

    /** Extracts the backend's type order for the provided value. */
    function __PRIVATE_typeOrder(e) {
        return "nullValue" in e ? 0 /* TypeOrder.NullValue */ : "booleanValue" in e ? 1 /* TypeOrder.BooleanValue */ : "integerValue" in e || "doubleValue" in e ? 2 /* TypeOrder.NumberValue */ : "timestampValue" in e ? 3 /* TypeOrder.TimestampValue */ : "stringValue" in e ? 5 /* TypeOrder.StringValue */ : "bytesValue" in e ? 6 /* TypeOrder.BlobValue */ : "referenceValue" in e ? 7 /* TypeOrder.RefValue */ : "geoPointValue" in e ? 8 /* TypeOrder.GeoPointValue */ : "arrayValue" in e ? 9 /* TypeOrder.ArrayValue */ : "mapValue" in e ? __PRIVATE_isServerTimestamp(e) ? 4 /* TypeOrder.ServerTimestampValue */ : __PRIVATE_isMaxValue(e) ? 9007199254740991 /* TypeOrder.MaxValue */ : 10 /* TypeOrder.ObjectValue */ : fail();
    }

    /** Tests `left` and `right` for equality based on the backend semantics. */ function __PRIVATE_valueEquals(e, t) {
        if (e === t) return !0;
        const n = __PRIVATE_typeOrder(e);
        if (n !== __PRIVATE_typeOrder(t)) return !1;
        switch (n) {
          case 0 /* TypeOrder.NullValue */ :
          case 9007199254740991 /* TypeOrder.MaxValue */ :
            return !0;

          case 1 /* TypeOrder.BooleanValue */ :
            return e.booleanValue === t.booleanValue;

          case 4 /* TypeOrder.ServerTimestampValue */ :
            return __PRIVATE_getLocalWriteTime(e).isEqual(__PRIVATE_getLocalWriteTime(t));

          case 3 /* TypeOrder.TimestampValue */ :
            return function __PRIVATE_timestampEquals(e, t) {
                if ("string" == typeof e.timestampValue && "string" == typeof t.timestampValue && e.timestampValue.length === t.timestampValue.length) 
                // Use string equality for ISO 8601 timestamps
                return e.timestampValue === t.timestampValue;
                const n = __PRIVATE_normalizeTimestamp(e.timestampValue), r = __PRIVATE_normalizeTimestamp(t.timestampValue);
                return n.seconds === r.seconds && n.nanos === r.nanos;
            }(e, t);

          case 5 /* TypeOrder.StringValue */ :
            return e.stringValue === t.stringValue;

          case 6 /* TypeOrder.BlobValue */ :
            return function __PRIVATE_blobEquals(e, t) {
                return __PRIVATE_normalizeByteString(e.bytesValue).isEqual(__PRIVATE_normalizeByteString(t.bytesValue));
            }(e, t);

          case 7 /* TypeOrder.RefValue */ :
            return e.referenceValue === t.referenceValue;

          case 8 /* TypeOrder.GeoPointValue */ :
            return function __PRIVATE_geoPointEquals(e, t) {
                return __PRIVATE_normalizeNumber(e.geoPointValue.latitude) === __PRIVATE_normalizeNumber(t.geoPointValue.latitude) && __PRIVATE_normalizeNumber(e.geoPointValue.longitude) === __PRIVATE_normalizeNumber(t.geoPointValue.longitude);
            }(e, t);

          case 2 /* TypeOrder.NumberValue */ :
            return function __PRIVATE_numberEquals(e, t) {
                if ("integerValue" in e && "integerValue" in t) return __PRIVATE_normalizeNumber(e.integerValue) === __PRIVATE_normalizeNumber(t.integerValue);
                if ("doubleValue" in e && "doubleValue" in t) {
                    const n = __PRIVATE_normalizeNumber(e.doubleValue), r = __PRIVATE_normalizeNumber(t.doubleValue);
                    return n === r ? __PRIVATE_isNegativeZero(n) === __PRIVATE_isNegativeZero(r) : isNaN(n) && isNaN(r);
                }
                return !1;
            }(e, t);

          case 9 /* TypeOrder.ArrayValue */ :
            return __PRIVATE_arrayEquals(e.arrayValue.values || [], t.arrayValue.values || [], __PRIVATE_valueEquals);

          case 10 /* TypeOrder.ObjectValue */ :
            return function __PRIVATE_objectEquals(e, t) {
                const n = e.mapValue.fields || {}, r = t.mapValue.fields || {};
                if (__PRIVATE_objectSize(n) !== __PRIVATE_objectSize(r)) return !1;
                for (const e in n) if (n.hasOwnProperty(e) && (void 0 === r[e] || !__PRIVATE_valueEquals(n[e], r[e]))) return !1;
                return !0;
            }
            /** Returns true if the ArrayValue contains the specified element. */ (e, t);

          default:
            return fail();
        }
    }

    function __PRIVATE_arrayValueContains(e, t) {
        return void 0 !== (e.values || []).find((e => __PRIVATE_valueEquals(e, t)));
    }

    function __PRIVATE_valueCompare(e, t) {
        if (e === t) return 0;
        const n = __PRIVATE_typeOrder(e), r = __PRIVATE_typeOrder(t);
        if (n !== r) return __PRIVATE_primitiveComparator(n, r);
        switch (n) {
          case 0 /* TypeOrder.NullValue */ :
          case 9007199254740991 /* TypeOrder.MaxValue */ :
            return 0;

          case 1 /* TypeOrder.BooleanValue */ :
            return __PRIVATE_primitiveComparator(e.booleanValue, t.booleanValue);

          case 2 /* TypeOrder.NumberValue */ :
            return function __PRIVATE_compareNumbers(e, t) {
                const n = __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue), r = __PRIVATE_normalizeNumber(t.integerValue || t.doubleValue);
                return n < r ? -1 : n > r ? 1 : n === r ? 0 : 
                // one or both are NaN.
                isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
            }(e, t);

          case 3 /* TypeOrder.TimestampValue */ :
            return __PRIVATE_compareTimestamps(e.timestampValue, t.timestampValue);

          case 4 /* TypeOrder.ServerTimestampValue */ :
            return __PRIVATE_compareTimestamps(__PRIVATE_getLocalWriteTime(e), __PRIVATE_getLocalWriteTime(t));

          case 5 /* TypeOrder.StringValue */ :
            return __PRIVATE_primitiveComparator(e.stringValue, t.stringValue);

          case 6 /* TypeOrder.BlobValue */ :
            return function __PRIVATE_compareBlobs(e, t) {
                const n = __PRIVATE_normalizeByteString(e), r = __PRIVATE_normalizeByteString(t);
                return n.compareTo(r);
            }(e.bytesValue, t.bytesValue);

          case 7 /* TypeOrder.RefValue */ :
            return function __PRIVATE_compareReferences(e, t) {
                const n = e.split("/"), r = t.split("/");
                for (let e = 0; e < n.length && e < r.length; e++) {
                    const t = __PRIVATE_primitiveComparator(n[e], r[e]);
                    if (0 !== t) return t;
                }
                return __PRIVATE_primitiveComparator(n.length, r.length);
            }(e.referenceValue, t.referenceValue);

          case 8 /* TypeOrder.GeoPointValue */ :
            return function __PRIVATE_compareGeoPoints(e, t) {
                const n = __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e.latitude), __PRIVATE_normalizeNumber(t.latitude));
                if (0 !== n) return n;
                return __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e.longitude), __PRIVATE_normalizeNumber(t.longitude));
            }(e.geoPointValue, t.geoPointValue);

          case 9 /* TypeOrder.ArrayValue */ :
            return function __PRIVATE_compareArrays(e, t) {
                const n = e.values || [], r = t.values || [];
                for (let e = 0; e < n.length && e < r.length; ++e) {
                    const t = __PRIVATE_valueCompare(n[e], r[e]);
                    if (t) return t;
                }
                return __PRIVATE_primitiveComparator(n.length, r.length);
            }(e.arrayValue, t.arrayValue);

          case 10 /* TypeOrder.ObjectValue */ :
            return function __PRIVATE_compareMaps(e, t) {
                if (e === te.mapValue && t === te.mapValue) return 0;
                if (e === te.mapValue) return 1;
                if (t === te.mapValue) return -1;
                const n = e.fields || {}, r = Object.keys(n), i = t.fields || {}, s = Object.keys(i);
                // Even though MapValues are likely sorted correctly based on their insertion
                // order (e.g. when received from the backend), local modifications can bring
                // elements out of order. We need to re-sort the elements to ensure that
                // canonical IDs are independent of insertion order.
                r.sort(), s.sort();
                for (let e = 0; e < r.length && e < s.length; ++e) {
                    const t = __PRIVATE_primitiveComparator(r[e], s[e]);
                    if (0 !== t) return t;
                    const o = __PRIVATE_valueCompare(n[r[e]], i[s[e]]);
                    if (0 !== o) return o;
                }
                return __PRIVATE_primitiveComparator(r.length, s.length);
            }
            /**
     * Generates the canonical ID for the provided field value (as used in Target
     * serialization).
     */ (e.mapValue, t.mapValue);

          default:
            throw fail();
        }
    }

    function __PRIVATE_compareTimestamps(e, t) {
        if ("string" == typeof e && "string" == typeof t && e.length === t.length) return __PRIVATE_primitiveComparator(e, t);
        const n = __PRIVATE_normalizeTimestamp(e), r = __PRIVATE_normalizeTimestamp(t), i = __PRIVATE_primitiveComparator(n.seconds, r.seconds);
        return 0 !== i ? i : __PRIVATE_primitiveComparator(n.nanos, r.nanos);
    }

    function canonicalId(e) {
        return __PRIVATE_canonifyValue(e);
    }

    function __PRIVATE_canonifyValue(e) {
        return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function __PRIVATE_canonifyTimestamp(e) {
            const t = __PRIVATE_normalizeTimestamp(e);
            return `time(${t.seconds},${t.nanos})`;
        }(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? function __PRIVATE_canonifyByteString(e) {
            return __PRIVATE_normalizeByteString(e).toBase64();
        }(e.bytesValue) : "referenceValue" in e ? function __PRIVATE_canonifyReference(e) {
            return DocumentKey.fromName(e).toString();
        }(e.referenceValue) : "geoPointValue" in e ? function __PRIVATE_canonifyGeoPoint(e) {
            return `geo(${e.latitude},${e.longitude})`;
        }(e.geoPointValue) : "arrayValue" in e ? function __PRIVATE_canonifyArray(e) {
            let t = "[", n = !0;
            for (const r of e.values || []) n ? n = !1 : t += ",", t += __PRIVATE_canonifyValue(r);
            return t + "]";
        }
        /**
     * Returns an approximate (and wildly inaccurate) in-memory size for the field
     * value.
     *
     * The memory size takes into account only the actual user data as it resides
     * in memory and ignores object overhead.
     */ (e.arrayValue) : "mapValue" in e ? function __PRIVATE_canonifyMap(e) {
            // Iteration order in JavaScript is not guaranteed. To ensure that we generate
            // matching canonical IDs for identical maps, we need to sort the keys.
            const t = Object.keys(e.fields || {}).sort();
            let n = "{", r = !0;
            for (const i of t) r ? r = !1 : n += ",", n += `${i}:${__PRIVATE_canonifyValue(e.fields[i])}`;
            return n + "}";
        }(e.mapValue) : fail();
    }

    /** Returns true if `value` is an IntegerValue . */ function isInteger(e) {
        return !!e && "integerValue" in e;
    }

    /** Returns true if `value` is a DoubleValue. */
    /** Returns true if `value` is an ArrayValue. */
    function isArray(e) {
        return !!e && "arrayValue" in e;
    }

    /** Returns true if `value` is a MapValue. */ function __PRIVATE_isMapValue(e) {
        return !!e && "mapValue" in e;
    }

    /** Creates a deep copy of `source`. */ function __PRIVATE_deepClone(e) {
        if (e.geoPointValue) return {
            geoPointValue: Object.assign({}, e.geoPointValue)
        };
        if (e.timestampValue && "object" == typeof e.timestampValue) return {
            timestampValue: Object.assign({}, e.timestampValue)
        };
        if (e.mapValue) {
            const t = {
                mapValue: {
                    fields: {}
                }
            };
            return forEach(e.mapValue.fields, ((e, n) => t.mapValue.fields[e] = __PRIVATE_deepClone(n))), 
            t;
        }
        if (e.arrayValue) {
            const t = {
                arrayValue: {
                    values: []
                }
            };
            for (let n = 0; n < (e.arrayValue.values || []).length; ++n) t.arrayValue.values[n] = __PRIVATE_deepClone(e.arrayValue.values[n]);
            return t;
        }
        return Object.assign({}, e);
    }

    /** Returns true if the Value represents the canonical {@link #MAX_VALUE} . */ function __PRIVATE_isMaxValue(e) {
        return "__max__" === (((e.mapValue || {}).fields || {}).__type__ || {}).stringValue;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An ObjectValue represents a MapValue in the Firestore Proto and offers the
     * ability to add and remove fields (via the ObjectValueBuilder).
     */ class ObjectValue {
        constructor(e) {
            this.value = e;
        }
        static empty() {
            return new ObjectValue({
                mapValue: {}
            });
        }
        /**
         * Returns the value at the given path or null.
         *
         * @param path - the path to search
         * @returns The value at the path or null if the path is not set.
         */    field(e) {
            if (e.isEmpty()) return this.value;
            {
                let t = this.value;
                for (let n = 0; n < e.length - 1; ++n) if (t = (t.mapValue.fields || {})[e.get(n)], 
                !__PRIVATE_isMapValue(t)) return null;
                return t = (t.mapValue.fields || {})[e.lastSegment()], t || null;
            }
        }
        /**
         * Sets the field to the provided value.
         *
         * @param path - The field path to set.
         * @param value - The value to set.
         */    set(e, t) {
            this.getFieldsMap(e.popLast())[e.lastSegment()] = __PRIVATE_deepClone(t);
        }
        /**
         * Sets the provided fields to the provided values.
         *
         * @param data - A map of fields to values (or null for deletes).
         */    setAll(e) {
            let t = FieldPath$1.emptyPath(), n = {}, r = [];
            e.forEach(((e, i) => {
                if (!t.isImmediateParentOf(i)) {
                    // Insert the accumulated changes at this parent location
                    const e = this.getFieldsMap(t);
                    this.applyChanges(e, n, r), n = {}, r = [], t = i.popLast();
                }
                e ? n[i.lastSegment()] = __PRIVATE_deepClone(e) : r.push(i.lastSegment());
            }));
            const i = this.getFieldsMap(t);
            this.applyChanges(i, n, r);
        }
        /**
         * Removes the field at the specified path. If there is no field at the
         * specified path, nothing is changed.
         *
         * @param path - The field path to remove.
         */    delete(e) {
            const t = this.field(e.popLast());
            __PRIVATE_isMapValue(t) && t.mapValue.fields && delete t.mapValue.fields[e.lastSegment()];
        }
        isEqual(e) {
            return __PRIVATE_valueEquals(this.value, e.value);
        }
        /**
         * Returns the map that contains the leaf element of `path`. If the parent
         * entry does not yet exist, or if it is not a map, a new map will be created.
         */    getFieldsMap(e) {
            let t = this.value;
            t.mapValue.fields || (t.mapValue = {
                fields: {}
            });
            for (let n = 0; n < e.length; ++n) {
                let r = t.mapValue.fields[e.get(n)];
                __PRIVATE_isMapValue(r) && r.mapValue.fields || (r = {
                    mapValue: {
                        fields: {}
                    }
                }, t.mapValue.fields[e.get(n)] = r), t = r;
            }
            return t.mapValue.fields;
        }
        /**
         * Modifies `fieldsMap` by adding, replacing or deleting the specified
         * entries.
         */    applyChanges(e, t, n) {
            forEach(t, ((t, n) => e[t] = n));
            for (const t of n) delete e[t];
        }
        clone() {
            return new ObjectValue(__PRIVATE_deepClone(this.value));
        }
    }

    /**
     * Returns a FieldMask built from all fields in a MapValue.
     */ function __PRIVATE_extractFieldMask(e) {
        const t = [];
        return forEach(e.fields, ((e, n) => {
            const r = new FieldPath$1([ e ]);
            if (__PRIVATE_isMapValue(n)) {
                const e = __PRIVATE_extractFieldMask(n.mapValue).fields;
                if (0 === e.length) 
                // Preserve the empty map by adding it to the FieldMask.
                t.push(r); else 
                // For nested and non-empty ObjectValues, add the FieldPath of the
                // leaf nodes.
                for (const n of e) t.push(r.child(n));
            } else 
            // For nested and non-empty ObjectValues, add the FieldPath of the leaf
            // nodes.
            t.push(r);
        })), new FieldMask(t);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a document in Firestore with a key, version, data and whether it
     * has local mutations applied to it.
     *
     * Documents can transition between states via `convertToFoundDocument()`,
     * `convertToNoDocument()` and `convertToUnknownDocument()`. If a document does
     * not transition to one of these states even after all mutations have been
     * applied, `isValidDocument()` returns false and the document should be removed
     * from all views.
     */ class MutableDocument {
        constructor(e, t, n, r, i, s, o) {
            this.key = e, this.documentType = t, this.version = n, this.readTime = r, this.createTime = i, 
            this.data = s, this.documentState = o;
        }
        /**
         * Creates a document with no known version or data, but which can serve as
         * base document for mutations.
         */    static newInvalidDocument(e) {
            return new MutableDocument(e, 0 /* DocumentType.INVALID */ , 
            /* version */ SnapshotVersion.min(), 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 0 /* DocumentState.SYNCED */);
        }
        /**
         * Creates a new document that is known to exist with the given data at the
         * given version.
         */    static newFoundDocument(e, t, n, r) {
            return new MutableDocument(e, 1 /* DocumentType.FOUND_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ n, r, 0 /* DocumentState.SYNCED */);
        }
        /** Creates a new document that is known to not exist at the given version. */    static newNoDocument(e, t) {
            return new MutableDocument(e, 2 /* DocumentType.NO_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 0 /* DocumentState.SYNCED */);
        }
        /**
         * Creates a new document that is known to exist at the given version but
         * whose data is not known (e.g. a document that was updated without a known
         * base document).
         */    static newUnknownDocument(e, t) {
            return new MutableDocument(e, 3 /* DocumentType.UNKNOWN_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */);
        }
        /**
         * Changes the document type to indicate that it exists and that its version
         * and data are known.
         */    convertToFoundDocument(e, t) {
            // If a document is switching state from being an invalid or deleted
            // document to a valid (FOUND_DOCUMENT) document, either due to receiving an
            // update from Watch or due to applying a local set mutation on top
            // of a deleted document, our best guess about its createTime would be the
            // version at which the document transitioned to a FOUND_DOCUMENT.
            return !this.createTime.isEqual(SnapshotVersion.min()) || 2 /* DocumentType.NO_DOCUMENT */ !== this.documentType && 0 /* DocumentType.INVALID */ !== this.documentType || (this.createTime = e), 
            this.version = e, this.documentType = 1 /* DocumentType.FOUND_DOCUMENT */ , this.data = t, 
            this.documentState = 0 /* DocumentState.SYNCED */ , this;
        }
        /**
         * Changes the document type to indicate that it doesn't exist at the given
         * version.
         */    convertToNoDocument(e) {
            return this.version = e, this.documentType = 2 /* DocumentType.NO_DOCUMENT */ , 
            this.data = ObjectValue.empty(), this.documentState = 0 /* DocumentState.SYNCED */ , 
            this;
        }
        /**
         * Changes the document type to indicate that it exists at a given version but
         * that its data is not known (e.g. a document that was updated without a known
         * base document).
         */    convertToUnknownDocument(e) {
            return this.version = e, this.documentType = 3 /* DocumentType.UNKNOWN_DOCUMENT */ , 
            this.data = ObjectValue.empty(), this.documentState = 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ , 
            this;
        }
        setHasCommittedMutations() {
            return this.documentState = 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ , this;
        }
        setHasLocalMutations() {
            return this.documentState = 1 /* DocumentState.HAS_LOCAL_MUTATIONS */ , this.version = SnapshotVersion.min(), 
            this;
        }
        setReadTime(e) {
            return this.readTime = e, this;
        }
        get hasLocalMutations() {
            return 1 /* DocumentState.HAS_LOCAL_MUTATIONS */ === this.documentState;
        }
        get hasCommittedMutations() {
            return 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ === this.documentState;
        }
        get hasPendingWrites() {
            return this.hasLocalMutations || this.hasCommittedMutations;
        }
        isValidDocument() {
            return 0 /* DocumentType.INVALID */ !== this.documentType;
        }
        isFoundDocument() {
            return 1 /* DocumentType.FOUND_DOCUMENT */ === this.documentType;
        }
        isNoDocument() {
            return 2 /* DocumentType.NO_DOCUMENT */ === this.documentType;
        }
        isUnknownDocument() {
            return 3 /* DocumentType.UNKNOWN_DOCUMENT */ === this.documentType;
        }
        isEqual(e) {
            return e instanceof MutableDocument && this.key.isEqual(e.key) && this.version.isEqual(e.version) && this.documentType === e.documentType && this.documentState === e.documentState && this.data.isEqual(e.data);
        }
        mutableCopy() {
            return new MutableDocument(this.key, this.documentType, this.version, this.readTime, this.createTime, this.data.clone(), this.documentState);
        }
        toString() {
            return `Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`;
        }
    }

    /**
     * Compares the value for field `field` in the provided documents. Throws if
     * the field does not exist in both documents.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a bound of a query.
     *
     * The bound is specified with the given components representing a position and
     * whether it's just before or just after the position (relative to whatever the
     * query order is).
     *
     * The position represents a logical index position for a query. It's a prefix
     * of values for the (potentially implicit) order by clauses of a query.
     *
     * Bound provides a function to determine whether a document comes before or
     * after a bound. This is influenced by whether the position is just before or
     * just after the provided values.
     */
    class Bound {
        constructor(e, t) {
            this.position = e, this.inclusive = t;
        }
    }

    function __PRIVATE_boundCompareToDocument(e, t, n) {
        let r = 0;
        for (let i = 0; i < e.position.length; i++) {
            const s = t[i], o = e.position[i];
            if (s.field.isKeyField()) r = DocumentKey.comparator(DocumentKey.fromName(o.referenceValue), n.key); else {
                r = __PRIVATE_valueCompare(o, n.data.field(s.field));
            }
            if ("desc" /* Direction.DESCENDING */ === s.dir && (r *= -1), 0 !== r) break;
        }
        return r;
    }

    /**
     * Returns true if a document sorts after a bound using the provided sort
     * order.
     */ function __PRIVATE_boundEquals(e, t) {
        if (null === e) return null === t;
        if (null === t) return !1;
        if (e.inclusive !== t.inclusive || e.position.length !== t.position.length) return !1;
        for (let n = 0; n < e.position.length; n++) {
            if (!__PRIVATE_valueEquals(e.position[n], t.position[n])) return !1;
        }
        return !0;
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
     */ class OrderBy {
        constructor(e, t = "asc" /* Direction.ASCENDING */) {
            this.field = e, this.dir = t;
        }
    }

    function __PRIVATE_orderByEquals(e, t) {
        return e.dir === t.dir && e.field.isEqual(t.field);
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class Filter {}

    class FieldFilter extends Filter {
        constructor(e, t, n) {
            super(), this.field = e, this.op = t, this.value = n;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    static create(e, t, n) {
            return e.isKeyField() ? "in" /* Operator.IN */ === t || "not-in" /* Operator.NOT_IN */ === t ? this.createKeyFieldInFilter(e, t, n) : new __PRIVATE_KeyFieldFilter(e, t, n) : "array-contains" /* Operator.ARRAY_CONTAINS */ === t ? new __PRIVATE_ArrayContainsFilter(e, n) : "in" /* Operator.IN */ === t ? new __PRIVATE_InFilter(e, n) : "not-in" /* Operator.NOT_IN */ === t ? new __PRIVATE_NotInFilter(e, n) : "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */ === t ? new __PRIVATE_ArrayContainsAnyFilter(e, n) : new FieldFilter(e, t, n);
        }
        static createKeyFieldInFilter(e, t, n) {
            return "in" /* Operator.IN */ === t ? new __PRIVATE_KeyFieldInFilter(e, n) : new __PRIVATE_KeyFieldNotInFilter(e, n);
        }
        matches(e) {
            const t = e.data.field(this.field);
            // Types do not have to match in NOT_EQUAL filters.
                    return "!=" /* Operator.NOT_EQUAL */ === this.op ? null !== t && this.matchesComparison(__PRIVATE_valueCompare(t, this.value)) : null !== t && __PRIVATE_typeOrder(this.value) === __PRIVATE_typeOrder(t) && this.matchesComparison(__PRIVATE_valueCompare(t, this.value));
            // Only compare types with matching backend order (such as double and int).
            }
        matchesComparison(e) {
            switch (this.op) {
              case "<" /* Operator.LESS_THAN */ :
                return e < 0;

              case "<=" /* Operator.LESS_THAN_OR_EQUAL */ :
                return e <= 0;

              case "==" /* Operator.EQUAL */ :
                return 0 === e;

              case "!=" /* Operator.NOT_EQUAL */ :
                return 0 !== e;

              case ">" /* Operator.GREATER_THAN */ :
                return e > 0;

              case ">=" /* Operator.GREATER_THAN_OR_EQUAL */ :
                return e >= 0;

              default:
                return fail();
            }
        }
        isInequality() {
            return [ "<" /* Operator.LESS_THAN */ , "<=" /* Operator.LESS_THAN_OR_EQUAL */ , ">" /* Operator.GREATER_THAN */ , ">=" /* Operator.GREATER_THAN_OR_EQUAL */ , "!=" /* Operator.NOT_EQUAL */ , "not-in" /* Operator.NOT_IN */ ].indexOf(this.op) >= 0;
        }
        getFlattenedFilters() {
            return [ this ];
        }
        getFilters() {
            return [ this ];
        }
    }

    class CompositeFilter extends Filter {
        constructor(e, t) {
            super(), this.filters = e, this.op = t, this.ce = null;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    static create(e, t) {
            return new CompositeFilter(e, t);
        }
        matches(e) {
            return __PRIVATE_compositeFilterIsConjunction(this) ? void 0 === this.filters.find((t => !t.matches(e))) : void 0 !== this.filters.find((t => t.matches(e)));
        }
        getFlattenedFilters() {
            return null !== this.ce || (this.ce = this.filters.reduce(((e, t) => e.concat(t.getFlattenedFilters())), [])), 
            this.ce;
        }
        // Returns a mutable copy of `this.filters`
        getFilters() {
            return Object.assign([], this.filters);
        }
    }

    function __PRIVATE_compositeFilterIsConjunction(e) {
        return "and" /* CompositeOperator.AND */ === e.op;
    }

    /**
     * Returns true if this filter is a conjunction of field filters only. Returns false otherwise.
     */ function __PRIVATE_compositeFilterIsFlatConjunction(e) {
        return __PRIVATE_compositeFilterIsFlat(e) && __PRIVATE_compositeFilterIsConjunction(e);
    }

    /**
     * Returns true if this filter does not contain any composite filters. Returns false otherwise.
     */ function __PRIVATE_compositeFilterIsFlat(e) {
        for (const t of e.filters) if (t instanceof CompositeFilter) return !1;
        return !0;
    }

    function __PRIVATE_canonifyFilter(e) {
        if (e instanceof FieldFilter) 
        // TODO(b/29183165): Technically, this won't be unique if two values have
        // the same description, such as the int 3 and the string "3". So we should
        // add the types in here somehow, too.
        return e.field.canonicalString() + e.op.toString() + canonicalId(e.value);
        if (__PRIVATE_compositeFilterIsFlatConjunction(e)) 
        // Older SDK versions use an implicit AND operation between their filters.
        // In the new SDK versions, the developer may use an explicit AND filter.
        // To stay consistent with the old usages, we add a special case to ensure
        // the canonical ID for these two are the same. For example:
        // `col.whereEquals("a", 1).whereEquals("b", 2)` should have the same
        // canonical ID as `col.where(and(equals("a",1), equals("b",2)))`.
        return e.filters.map((e => __PRIVATE_canonifyFilter(e))).join(",");
        {
            // filter instanceof CompositeFilter
            const t = e.filters.map((e => __PRIVATE_canonifyFilter(e))).join(",");
            return `${e.op}(${t})`;
        }
    }

    function __PRIVATE_filterEquals(e, t) {
        return e instanceof FieldFilter ? function __PRIVATE_fieldFilterEquals(e, t) {
            return t instanceof FieldFilter && e.op === t.op && e.field.isEqual(t.field) && __PRIVATE_valueEquals(e.value, t.value);
        }(e, t) : e instanceof CompositeFilter ? function __PRIVATE_compositeFilterEquals(e, t) {
            if (t instanceof CompositeFilter && e.op === t.op && e.filters.length === t.filters.length) {
                return e.filters.reduce(((e, n, r) => e && __PRIVATE_filterEquals(n, t.filters[r])), !0);
            }
            return !1;
        }
        /**
     * Returns a new composite filter that contains all filter from
     * `compositeFilter` plus all the given filters in `otherFilters`.
     */ (e, t) : void fail();
    }

    /** Returns a debug description for `filter`. */ function __PRIVATE_stringifyFilter(e) {
        return e instanceof FieldFilter ? function __PRIVATE_stringifyFieldFilter(e) {
            return `${e.field.canonicalString()} ${e.op} ${canonicalId(e.value)}`;
        }
        /** Filter that matches on key fields (i.e. '__name__'). */ (e) : e instanceof CompositeFilter ? function __PRIVATE_stringifyCompositeFilter(e) {
            return e.op.toString() + " {" + e.getFilters().map(__PRIVATE_stringifyFilter).join(" ,") + "}";
        }(e) : "Filter";
    }

    class __PRIVATE_KeyFieldFilter extends FieldFilter {
        constructor(e, t, n) {
            super(e, t, n), this.key = DocumentKey.fromName(n.referenceValue);
        }
        matches(e) {
            const t = DocumentKey.comparator(e.key, this.key);
            return this.matchesComparison(t);
        }
    }

    /** Filter that matches on key fields within an array. */ class __PRIVATE_KeyFieldInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "in" /* Operator.IN */ , t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("in" /* Operator.IN */ , t);
        }
        matches(e) {
            return this.keys.some((t => t.isEqual(e.key)));
        }
    }

    /** Filter that matches on key fields not present within an array. */ class __PRIVATE_KeyFieldNotInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "not-in" /* Operator.NOT_IN */ , t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("not-in" /* Operator.NOT_IN */ , t);
        }
        matches(e) {
            return !this.keys.some((t => t.isEqual(e.key)));
        }
    }

    function __PRIVATE_extractDocumentKeysFromArrayValue(e, t) {
        var n;
        return ((null === (n = t.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((e => DocumentKey.fromName(e.referenceValue)));
    }

    /** A Filter that implements the array-contains operator. */ class __PRIVATE_ArrayContainsFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "array-contains" /* Operator.ARRAY_CONTAINS */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return isArray(t) && __PRIVATE_arrayValueContains(t.arrayValue, this.value);
        }
    }

    /** A Filter that implements the IN operator. */ class __PRIVATE_InFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "in" /* Operator.IN */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return null !== t && __PRIVATE_arrayValueContains(this.value.arrayValue, t);
        }
    }

    /** A Filter that implements the not-in operator. */ class __PRIVATE_NotInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "not-in" /* Operator.NOT_IN */ , t);
        }
        matches(e) {
            if (__PRIVATE_arrayValueContains(this.value.arrayValue, {
                nullValue: "NULL_VALUE"
            })) return !1;
            const t = e.data.field(this.field);
            return null !== t && !__PRIVATE_arrayValueContains(this.value.arrayValue, t);
        }
    }

    /** A Filter that implements the array-contains-any operator. */ class __PRIVATE_ArrayContainsAnyFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return !(!isArray(t) || !t.arrayValue.values) && t.arrayValue.values.some((e => __PRIVATE_arrayValueContains(this.value.arrayValue, e)));
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Visible for testing
    class __PRIVATE_TargetImpl {
        constructor(e, t = null, n = [], r = [], i = null, s = null, o = null) {
            this.path = e, this.collectionGroup = t, this.orderBy = n, this.filters = r, this.limit = i, 
            this.startAt = s, this.endAt = o, this.le = null;
        }
    }

    /**
     * Initializes a Target with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     *
     * NOTE: you should always construct `Target` from `Query.toTarget` instead of
     * using this factory method, because `Query` provides an implicit `orderBy`
     * property.
     */ function __PRIVATE_newTarget(e, t = null, n = [], r = [], i = null, s = null, o = null) {
        return new __PRIVATE_TargetImpl(e, t, n, r, i, s, o);
    }

    function __PRIVATE_canonifyTarget(e) {
        const t = __PRIVATE_debugCast(e);
        if (null === t.le) {
            let e = t.path.canonicalString();
            null !== t.collectionGroup && (e += "|cg:" + t.collectionGroup), e += "|f:", e += t.filters.map((e => __PRIVATE_canonifyFilter(e))).join(","), 
            e += "|ob:", e += t.orderBy.map((e => function __PRIVATE_canonifyOrderBy(e) {
                // TODO(b/29183165): Make this collision robust.
                return e.field.canonicalString() + e.dir;
            }(e))).join(","), __PRIVATE_isNullOrUndefined(t.limit) || (e += "|l:", e += t.limit), 
            t.startAt && (e += "|lb:", e += t.startAt.inclusive ? "b:" : "a:", e += t.startAt.position.map((e => canonicalId(e))).join(",")), 
            t.endAt && (e += "|ub:", e += t.endAt.inclusive ? "a:" : "b:", e += t.endAt.position.map((e => canonicalId(e))).join(",")), 
            t.le = e;
        }
        return t.le;
    }

    function __PRIVATE_targetEquals(e, t) {
        if (e.limit !== t.limit) return !1;
        if (e.orderBy.length !== t.orderBy.length) return !1;
        for (let n = 0; n < e.orderBy.length; n++) if (!__PRIVATE_orderByEquals(e.orderBy[n], t.orderBy[n])) return !1;
        if (e.filters.length !== t.filters.length) return !1;
        for (let n = 0; n < e.filters.length; n++) if (!__PRIVATE_filterEquals(e.filters[n], t.filters[n])) return !1;
        return e.collectionGroup === t.collectionGroup && (!!e.path.isEqual(t.path) && (!!__PRIVATE_boundEquals(e.startAt, t.startAt) && __PRIVATE_boundEquals(e.endAt, t.endAt)));
    }

    /** Returns the number of segments of a perfect index for this target. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Query encapsulates all the query attributes we support in the SDK. It can
     * be run against the LocalStore, as well as be converted to a `Target` to
     * query the RemoteStore results.
     *
     * Visible for testing.
     */
    class __PRIVATE_QueryImpl {
        /**
         * Initializes a Query with a path and optional additional query constraints.
         * Path must currently be empty if this is a collection group query.
         */
        constructor(e, t = null, n = [], r = [], i = null, s = "F" /* LimitType.First */ , o = null, _ = null) {
            this.path = e, this.collectionGroup = t, this.explicitOrderBy = n, this.filters = r, 
            this.limit = i, this.limitType = s, this.startAt = o, this.endAt = _, this.he = null, 
            // The corresponding `Target` of this `Query` instance, for use with
            // non-aggregate queries.
            this.Pe = null, 
            // The corresponding `Target` of this `Query` instance, for use with
            // aggregate queries. Unlike targets for non-aggregate queries,
            // aggregate query targets do not contain normalized order-bys, they only
            // contain explicit order-bys.
            this.Ie = null, this.startAt, this.endAt;
        }
    }

    /** Creates a new Query instance with the options provided. */ function __PRIVATE_newQuery(e, t, n, r, i, s, o, _) {
        return new __PRIVATE_QueryImpl(e, t, n, r, i, s, o, _);
    }

    /** Creates a new Query for a query that matches all documents at `path` */ function __PRIVATE_newQueryForPath(e) {
        return new __PRIVATE_QueryImpl(e);
    }

    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */
    /**
     * Returns true if this query does not specify any query constraints that
     * could remove results.
     */
    function __PRIVATE_queryMatchesAllDocuments(e) {
        return 0 === e.filters.length && null === e.limit && null == e.startAt && null == e.endAt && (0 === e.explicitOrderBy.length || 1 === e.explicitOrderBy.length && e.explicitOrderBy[0].field.isKeyField());
    }

    // Returns the sorted set of inequality filter fields used in this query.
    /**
     * Returns whether the query matches a collection group rather than a specific
     * collection.
     */
    function __PRIVATE_isCollectionGroupQuery(e) {
        return null !== e.collectionGroup;
    }

    /**
     * Returns the normalized order-by constraint that is used to execute the Query,
     * which can be different from the order-by constraints the user provided (e.g.
     * the SDK and backend always orders by `__name__`). The normalized order-by
     * includes implicit order-bys in addition to the explicit user provided
     * order-bys.
     */ function __PRIVATE_queryNormalizedOrderBy(e) {
        const t = __PRIVATE_debugCast(e);
        if (null === t.he) {
            t.he = [];
            const e = new Set;
            // Any explicit order by fields should be added as is.
                    for (const n of t.explicitOrderBy) t.he.push(n), e.add(n.field.canonicalString());
            // The order of the implicit ordering always matches the last explicit order by.
                    const n = t.explicitOrderBy.length > 0 ? t.explicitOrderBy[t.explicitOrderBy.length - 1].dir : "asc" /* Direction.ASCENDING */ , r = function __PRIVATE_getInequalityFilterFields(e) {
                let t = new SortedSet(FieldPath$1.comparator);
                return e.filters.forEach((e => {
                    e.getFlattenedFilters().forEach((e => {
                        e.isInequality() && (t = t.add(e.field));
                    }));
                })), t;
            }
            /**
     * Creates a new Query for a collection group query that matches all documents
     * within the provided collection group.
     */ (t);
            // Any inequality fields not explicitly ordered should be implicitly ordered in a lexicographical
            // order. When there are multiple inequality filters on the same field, the field should be added
            // only once.
            // Note: `SortedSet<FieldPath>` sorts the key field before other fields. However, we want the key
            // field to be sorted last.
                    r.forEach((r => {
                e.has(r.canonicalString()) || r.isKeyField() || t.he.push(new OrderBy(r, n));
            })), 
            // Add the document key field to the last if it is not explicitly ordered.
            e.has(FieldPath$1.keyField().canonicalString()) || t.he.push(new OrderBy(FieldPath$1.keyField(), n));
        }
        return t.he;
    }

    /**
     * Converts this `Query` instance to its corresponding `Target` representation.
     */ function __PRIVATE_queryToTarget(e) {
        const t = __PRIVATE_debugCast(e);
        return t.Pe || (t.Pe = __PRIVATE__queryToTarget(t, __PRIVATE_queryNormalizedOrderBy(e))), 
        t.Pe;
    }

    /**
     * Converts this `Query` instance to its corresponding `Target` representation,
     * for use within an aggregate query. Unlike targets for non-aggregate queries,
     * aggregate query targets do not contain normalized order-bys, they only
     * contain explicit order-bys.
     */ function __PRIVATE__queryToTarget(e, t) {
        if ("F" /* LimitType.First */ === e.limitType) return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, e.startAt, e.endAt);
        {
            // Flip the orderBy directions since we want the last results
            t = t.map((e => {
                const t = "desc" /* Direction.DESCENDING */ === e.dir ? "asc" /* Direction.ASCENDING */ : "desc" /* Direction.DESCENDING */;
                return new OrderBy(e.field, t);
            }));
            // We need to swap the cursors to match the now-flipped query ordering.
            const n = e.endAt ? new Bound(e.endAt.position, e.endAt.inclusive) : null, r = e.startAt ? new Bound(e.startAt.position, e.startAt.inclusive) : null;
            // Now return as a LimitType.First query.
            return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, n, r);
        }
    }

    function __PRIVATE_queryWithLimit(e, t, n) {
        return new __PRIVATE_QueryImpl(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), t, n, e.startAt, e.endAt);
    }

    function __PRIVATE_queryEquals(e, t) {
        return __PRIVATE_targetEquals(__PRIVATE_queryToTarget(e), __PRIVATE_queryToTarget(t)) && e.limitType === t.limitType;
    }

    // TODO(b/29183165): This is used to get a unique string from a query to, for
    // example, use as a dictionary key, but the implementation is subject to
    // collisions. Make it collision-free.
    function __PRIVATE_canonifyQuery(e) {
        return `${__PRIVATE_canonifyTarget(__PRIVATE_queryToTarget(e))}|lt:${e.limitType}`;
    }

    function __PRIVATE_stringifyQuery(e) {
        return `Query(target=${function __PRIVATE_stringifyTarget(e) {
        let t = e.path.canonicalString();
        return null !== e.collectionGroup && (t += " collectionGroup=" + e.collectionGroup), 
        e.filters.length > 0 && (t += `, filters: [${e.filters.map((e => __PRIVATE_stringifyFilter(e))).join(", ")}]`), 
        __PRIVATE_isNullOrUndefined(e.limit) || (t += ", limit: " + e.limit), e.orderBy.length > 0 && (t += `, orderBy: [${e.orderBy.map((e => function __PRIVATE_stringifyOrderBy(e) {
            return `${e.field.canonicalString()} (${e.dir})`;
        }(e))).join(", ")}]`), e.startAt && (t += ", startAt: ", t += e.startAt.inclusive ? "b:" : "a:", 
        t += e.startAt.position.map((e => canonicalId(e))).join(",")), e.endAt && (t += ", endAt: ", 
        t += e.endAt.inclusive ? "a:" : "b:", t += e.endAt.position.map((e => canonicalId(e))).join(",")), 
        `Target(${t})`;
    }(__PRIVATE_queryToTarget(e))}; limitType=${e.limitType})`;
    }

    /** Returns whether `doc` matches the constraints of `query`. */ function __PRIVATE_queryMatches(e, t) {
        return t.isFoundDocument() && function __PRIVATE_queryMatchesPathAndCollectionGroup(e, t) {
            const n = t.key.path;
            return null !== e.collectionGroup ? t.key.hasCollectionId(e.collectionGroup) && e.path.isPrefixOf(n) : DocumentKey.isDocumentKey(e.path) ? e.path.isEqual(n) : e.path.isImmediateParentOf(n);
        }
        /**
     * A document must have a value for every ordering clause in order to show up
     * in the results.
     */ (e, t) && function __PRIVATE_queryMatchesOrderBy(e, t) {
            // We must use `queryNormalizedOrderBy()` to get the list of all orderBys (both implicit and explicit).
            // Note that for OR queries, orderBy applies to all disjunction terms and implicit orderBys must
            // be taken into account. For example, the query "a > 1 || b==1" has an implicit "orderBy a" due
            // to the inequality, and is evaluated as "a > 1 orderBy a || b==1 orderBy a".
            // A document with content of {b:1} matches the filters, but does not match the orderBy because
            // it's missing the field 'a'.
            for (const n of __PRIVATE_queryNormalizedOrderBy(e)) 
            // order-by key always matches
            if (!n.field.isKeyField() && null === t.data.field(n.field)) return !1;
            return !0;
        }(e, t) && function __PRIVATE_queryMatchesFilters(e, t) {
            for (const n of e.filters) if (!n.matches(t)) return !1;
            return !0;
        }
        /** Makes sure a document is within the bounds, if provided. */ (e, t) && function __PRIVATE_queryMatchesBounds(e, t) {
            if (e.startAt && !
            /**
     * Returns true if a document sorts before a bound using the provided sort
     * order.
     */
            function __PRIVATE_boundSortsBeforeDocument(e, t, n) {
                const r = __PRIVATE_boundCompareToDocument(e, t, n);
                return e.inclusive ? r <= 0 : r < 0;
            }(e.startAt, __PRIVATE_queryNormalizedOrderBy(e), t)) return !1;
            if (e.endAt && !function __PRIVATE_boundSortsAfterDocument(e, t, n) {
                const r = __PRIVATE_boundCompareToDocument(e, t, n);
                return e.inclusive ? r >= 0 : r > 0;
            }(e.endAt, __PRIVATE_queryNormalizedOrderBy(e), t)) return !1;
            return !0;
        }
        /**
     * Returns the collection group that this query targets.
     *
     * PORTING NOTE: This is only used in the Web SDK to facilitate multi-tab
     * synchronization for query results.
     */ (e, t);
    }

    /**
     * Returns a new comparator function that can be used to compare two documents
     * based on the Query's ordering constraint.
     */ function __PRIVATE_newQueryComparator(e) {
        return (t, n) => {
            let r = !1;
            for (const i of __PRIVATE_queryNormalizedOrderBy(e)) {
                const e = __PRIVATE_compareDocs(i, t, n);
                if (0 !== e) return e;
                r = r || i.field.isKeyField();
            }
            return 0;
        };
    }

    function __PRIVATE_compareDocs(e, t, n) {
        const r = e.field.isKeyField() ? DocumentKey.comparator(t.key, n.key) : function __PRIVATE_compareDocumentsByField(e, t, n) {
            const r = t.data.field(e), i = n.data.field(e);
            return null !== r && null !== i ? __PRIVATE_valueCompare(r, i) : fail();
        }(e.field, t, n);
        switch (e.dir) {
          case "asc" /* Direction.ASCENDING */ :
            return r;

          case "desc" /* Direction.DESCENDING */ :
            return -1 * r;

          default:
            return fail();
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A map implementation that uses objects as keys. Objects must have an
     * associated equals function and must be immutable. Entries in the map are
     * stored together with the key being produced from the mapKeyFn. This map
     * automatically handles collisions of keys.
     */ class ObjectMap {
        constructor(e, t) {
            this.mapKeyFn = e, this.equalsFn = t, 
            /**
             * The inner map for a key/value pair. Due to the possibility of collisions we
             * keep a list of entries that we do a linear search through to find an actual
             * match. Note that collisions should be rare, so we still expect near
             * constant time lookups in practice.
             */
            this.inner = {}, 
            /** The number of entries stored in the map */
            this.innerSize = 0;
        }
        /** Get a value for this key, or undefined if it does not exist. */    get(e) {
            const t = this.mapKeyFn(e), n = this.inner[t];
            if (void 0 !== n) for (const [t, r] of n) if (this.equalsFn(t, e)) return r;
        }
        has(e) {
            return void 0 !== this.get(e);
        }
        /** Put this key and value in the map. */    set(e, t) {
            const n = this.mapKeyFn(e), r = this.inner[n];
            if (void 0 === r) return this.inner[n] = [ [ e, t ] ], void this.innerSize++;
            for (let n = 0; n < r.length; n++) if (this.equalsFn(r[n][0], e)) 
            // This is updating an existing entry and does not increase `innerSize`.
            return void (r[n] = [ e, t ]);
            r.push([ e, t ]), this.innerSize++;
        }
        /**
         * Remove this key from the map. Returns a boolean if anything was deleted.
         */    delete(e) {
            const t = this.mapKeyFn(e), n = this.inner[t];
            if (void 0 === n) return !1;
            for (let r = 0; r < n.length; r++) if (this.equalsFn(n[r][0], e)) return 1 === n.length ? delete this.inner[t] : n.splice(r, 1), 
            this.innerSize--, !0;
            return !1;
        }
        forEach(e) {
            forEach(this.inner, ((t, n) => {
                for (const [t, r] of n) e(t, r);
            }));
        }
        isEmpty() {
            return isEmpty(this.inner);
        }
        size() {
            return this.innerSize;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const re = new SortedMap(DocumentKey.comparator);

    function __PRIVATE_mutableDocumentMap() {
        return re;
    }

    const ie = new SortedMap(DocumentKey.comparator);

    function documentMap(...e) {
        let t = ie;
        for (const n of e) t = t.insert(n.key, n);
        return t;
    }

    function __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e) {
        let t = ie;
        return e.forEach(((e, n) => t = t.insert(e, n.overlayedDocument))), t;
    }

    function __PRIVATE_newOverlayMap() {
        return __PRIVATE_newDocumentKeyMap();
    }

    function __PRIVATE_newMutationMap() {
        return __PRIVATE_newDocumentKeyMap();
    }

    function __PRIVATE_newDocumentKeyMap() {
        return new ObjectMap((e => e.toString()), ((e, t) => e.isEqual(t)));
    }

    const se = new SortedMap(DocumentKey.comparator);

    const oe = new SortedSet(DocumentKey.comparator);

    function __PRIVATE_documentKeySet(...e) {
        let t = oe;
        for (const n of e) t = t.add(n);
        return t;
    }

    const _e = new SortedSet(__PRIVATE_primitiveComparator);

    function __PRIVATE_targetIdSet() {
        return _e;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns an DoubleValue for `value` that is encoded based the serializer's
     * `useProto3Json` setting.
     */ function __PRIVATE_toDouble(e, t) {
        if (e.useProto3Json) {
            if (isNaN(t)) return {
                doubleValue: "NaN"
            };
            if (t === 1 / 0) return {
                doubleValue: "Infinity"
            };
            if (t === -1 / 0) return {
                doubleValue: "-Infinity"
            };
        }
        return {
            doubleValue: __PRIVATE_isNegativeZero(t) ? "-0" : t
        };
    }

    /**
     * Returns an IntegerValue for `value`.
     */ function __PRIVATE_toInteger(e) {
        return {
            integerValue: "" + e
        };
    }

    /**
     * Returns a value for a number that's appropriate to put into a proto.
     * The return value is an IntegerValue if it can safely represent the value,
     * otherwise a DoubleValue is returned.
     */ function toNumber(e, t) {
        return isSafeInteger(t) ? __PRIVATE_toInteger(t) : __PRIVATE_toDouble(e, t);
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Used to represent a field transform on a mutation. */ class TransformOperation {
        constructor() {
            // Make sure that the structural type of `TransformOperation` is unique.
            // See https://github.com/microsoft/TypeScript/issues/5451
            this._ = void 0;
        }
    }

    /**
     * Computes the local transform result against the provided `previousValue`,
     * optionally using the provided localWriteTime.
     */ function __PRIVATE_applyTransformOperationToLocalView(e, t, n) {
        return e instanceof __PRIVATE_ServerTimestampTransform ? function serverTimestamp$1(e, t) {
            const n = {
                fields: {
                    __type__: {
                        stringValue: "server_timestamp"
                    },
                    __local_write_time__: {
                        timestampValue: {
                            seconds: e.seconds,
                            nanos: e.nanoseconds
                        }
                    }
                }
            };
            // We should avoid storing deeply nested server timestamp map values
            // because we never use the intermediate "previous values".
            // For example:
            // previous: 42L, add: t1, result: t1 -> 42L
            // previous: t1,  add: t2, result: t2 -> 42L (NOT t2 -> t1 -> 42L)
            // previous: t2,  add: t3, result: t3 -> 42L (NOT t3 -> t2 -> t1 -> 42L)
            // `getPreviousValue` recursively traverses server timestamps to find the
            // least recent Value.
                    return t && __PRIVATE_isServerTimestamp(t) && (t = __PRIVATE_getPreviousValue(t)), 
            t && (n.fields.__previous_value__ = t), {
                mapValue: n
            };
        }(n, t) : e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : function __PRIVATE_applyNumericIncrementTransformOperationToLocalView(e, t) {
            // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
            // precision and resolves overflows by reducing precision, we do not
            // manually cap overflows at 2^63.
            const n = __PRIVATE_computeTransformOperationBaseValue(e, t), r = asNumber(n) + asNumber(e.Te);
            return isInteger(n) && isInteger(e.Te) ? __PRIVATE_toInteger(r) : __PRIVATE_toDouble(e.serializer, r);
        }(e, t);
    }

    /**
     * Computes a final transform result after the transform has been acknowledged
     * by the server, potentially using the server-provided transformResult.
     */ function __PRIVATE_applyTransformOperationToRemoteDocument(e, t, n) {
        // The server just sends null as the transform result for array operations,
        // so we have to calculate a result the same as we do for local
        // applications.
        return e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : n;
    }

    /**
     * If this transform operation is not idempotent, returns the base value to
     * persist for this transform. If a base value is returned, the transform
     * operation is always applied to this base value, even if document has
     * already been updated.
     *
     * Base values provide consistent behavior for non-idempotent transforms and
     * allow us to return the same latency-compensated value even if the backend
     * has already applied the transform operation. The base value is null for
     * idempotent transforms, as they can be re-played even if the backend has
     * already applied them.
     *
     * @returns a base value to store along with the mutation, or null for
     * idempotent transforms.
     */ function __PRIVATE_computeTransformOperationBaseValue(e, t) {
        return e instanceof __PRIVATE_NumericIncrementTransformOperation ? 
        /** Returns true if `value` is either an IntegerValue or a DoubleValue. */
        function __PRIVATE_isNumber(e) {
            return isInteger(e) || function __PRIVATE_isDouble(e) {
                return !!e && "doubleValue" in e;
            }(e);
        }(t) ? t : {
            integerValue: 0
        } : null;
    }

    /** Transforms a value into a server-generated timestamp. */
    class __PRIVATE_ServerTimestampTransform extends TransformOperation {}

    /** Transforms an array value via a union operation. */ class __PRIVATE_ArrayUnionTransformOperation extends TransformOperation {
        constructor(e) {
            super(), this.elements = e;
        }
    }

    function __PRIVATE_applyArrayUnionTransformOperation(e, t) {
        const n = __PRIVATE_coercedFieldValuesArray(t);
        for (const t of e.elements) n.some((e => __PRIVATE_valueEquals(e, t))) || n.push(t);
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /** Transforms an array value via a remove operation. */ class __PRIVATE_ArrayRemoveTransformOperation extends TransformOperation {
        constructor(e) {
            super(), this.elements = e;
        }
    }

    function __PRIVATE_applyArrayRemoveTransformOperation(e, t) {
        let n = __PRIVATE_coercedFieldValuesArray(t);
        for (const t of e.elements) n = n.filter((e => !__PRIVATE_valueEquals(e, t)));
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /**
     * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
     * transforms. Converts all field values to integers or doubles, but unlike the
     * backend does not cap integer values at 2^63. Instead, JavaScript number
     * arithmetic is used and precision loss can occur for values greater than 2^53.
     */ class __PRIVATE_NumericIncrementTransformOperation extends TransformOperation {
        constructor(e, t) {
            super(), this.serializer = e, this.Te = t;
        }
    }

    function asNumber(e) {
        return __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue);
    }

    function __PRIVATE_coercedFieldValuesArray(e) {
        return isArray(e) && e.arrayValue.values ? e.arrayValue.values.slice() : [];
    }

    function __PRIVATE_fieldTransformEquals(e, t) {
        return e.field.isEqual(t.field) && function __PRIVATE_transformOperationEquals(e, t) {
            return e instanceof __PRIVATE_ArrayUnionTransformOperation && t instanceof __PRIVATE_ArrayUnionTransformOperation || e instanceof __PRIVATE_ArrayRemoveTransformOperation && t instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_arrayEquals(e.elements, t.elements, __PRIVATE_valueEquals) : e instanceof __PRIVATE_NumericIncrementTransformOperation && t instanceof __PRIVATE_NumericIncrementTransformOperation ? __PRIVATE_valueEquals(e.Te, t.Te) : e instanceof __PRIVATE_ServerTimestampTransform && t instanceof __PRIVATE_ServerTimestampTransform;
        }(e.transform, t.transform);
    }

    /** The result of successfully applying a mutation to the backend. */
    class MutationResult {
        constructor(
        /**
         * The version at which the mutation was committed:
         *
         * - For most operations, this is the updateTime in the WriteResult.
         * - For deletes, the commitTime of the WriteResponse (because deletes are
         *   not stored and have no updateTime).
         *
         * Note that these versions can be different: No-op writes will not change
         * the updateTime even though the commitTime advances.
         */
        e, 
        /**
         * The resulting fields returned from the backend after a mutation
         * containing field transforms has been committed. Contains one FieldValue
         * for each FieldTransform that was in the mutation.
         *
         * Will be empty if the mutation did not contain any field transforms.
         */
        t) {
            this.version = e, this.transformResults = t;
        }
    }

    /**
     * Encodes a precondition for a mutation. This follows the model that the
     * backend accepts with the special case of an explicit "empty" precondition
     * (meaning no precondition).
     */ class Precondition {
        constructor(e, t) {
            this.updateTime = e, this.exists = t;
        }
        /** Creates a new empty Precondition. */    static none() {
            return new Precondition;
        }
        /** Creates a new Precondition with an exists flag. */    static exists(e) {
            return new Precondition(void 0, e);
        }
        /** Creates a new Precondition based on a version a document exists at. */    static updateTime(e) {
            return new Precondition(e);
        }
        /** Returns whether this Precondition is empty. */    get isNone() {
            return void 0 === this.updateTime && void 0 === this.exists;
        }
        isEqual(e) {
            return this.exists === e.exists && (this.updateTime ? !!e.updateTime && this.updateTime.isEqual(e.updateTime) : !e.updateTime);
        }
    }

    /** Returns true if the preconditions is valid for the given document. */ function __PRIVATE_preconditionIsValidForDocument(e, t) {
        return void 0 !== e.updateTime ? t.isFoundDocument() && t.version.isEqual(e.updateTime) : void 0 === e.exists || e.exists === t.isFoundDocument();
    }

    /**
     * A mutation describes a self-contained change to a document. Mutations can
     * create, replace, delete, and update subsets of documents.
     *
     * Mutations not only act on the value of the document but also its version.
     *
     * For local mutations (mutations that haven't been committed yet), we preserve
     * the existing version for Set and Patch mutations. For Delete mutations, we
     * reset the version to 0.
     *
     * Here's the expected transition table.
     *
     * MUTATION           APPLIED TO            RESULTS IN
     *
     * SetMutation        Document(v3)          Document(v3)
     * SetMutation        NoDocument(v3)        Document(v0)
     * SetMutation        InvalidDocument(v0)   Document(v0)
     * PatchMutation      Document(v3)          Document(v3)
     * PatchMutation      NoDocument(v3)        NoDocument(v3)
     * PatchMutation      InvalidDocument(v0)   UnknownDocument(v3)
     * DeleteMutation     Document(v3)          NoDocument(v0)
     * DeleteMutation     NoDocument(v3)        NoDocument(v0)
     * DeleteMutation     InvalidDocument(v0)   NoDocument(v0)
     *
     * For acknowledged mutations, we use the updateTime of the WriteResponse as
     * the resulting version for Set and Patch mutations. As deletes have no
     * explicit update time, we use the commitTime of the WriteResponse for
     * Delete mutations.
     *
     * If a mutation is acknowledged by the backend but fails the precondition check
     * locally, we transition to an `UnknownDocument` and rely on Watch to send us
     * the updated version.
     *
     * Field transforms are used only with Patch and Set Mutations. We use the
     * `updateTransforms` message to store transforms, rather than the `transforms`s
     * messages.
     *
     * ## Subclassing Notes
     *
     * Every type of mutation needs to implement its own applyToRemoteDocument() and
     * applyToLocalView() to implement the actual behavior of applying the mutation
     * to some source document (see `setMutationApplyToRemoteDocument()` for an
     * example).
     */ class Mutation {}

    /**
     * A utility method to calculate a `Mutation` representing the overlay from the
     * final state of the document, and a `FieldMask` representing the fields that
     * are mutated by the local mutations.
     */ function __PRIVATE_calculateOverlayMutation(e, t) {
        if (!e.hasLocalMutations || t && 0 === t.fields.length) return null;
        // mask is null when sets or deletes are applied to the current document.
            if (null === t) return e.isNoDocument() ? new __PRIVATE_DeleteMutation(e.key, Precondition.none()) : new __PRIVATE_SetMutation(e.key, e.data, Precondition.none());
        {
            const n = e.data, r = ObjectValue.empty();
            let i = new SortedSet(FieldPath$1.comparator);
            for (let e of t.fields) if (!i.has(e)) {
                let t = n.field(e);
                // If we are deleting a nested field, we take the immediate parent as
                // the mask used to construct the resulting mutation.
                // Justification: Nested fields can create parent fields implicitly. If
                // only a leaf entry is deleted in later mutations, the parent field
                // should still remain, but we may have lost this information.
                // Consider mutation (foo.bar 1), then mutation (foo.bar delete()).
                // This leaves the final result (foo, {}). Despite the fact that `doc`
                // has the correct result, `foo` is not in `mask`, and the resulting
                // mutation would miss `foo`.
                            null === t && e.length > 1 && (e = e.popLast(), t = n.field(e)), null === t ? r.delete(e) : r.set(e, t), 
                i = i.add(e);
            }
            return new __PRIVATE_PatchMutation(e.key, r, new FieldMask(i.toArray()), Precondition.none());
        }
    }

    /**
     * Applies this mutation to the given document for the purposes of computing a
     * new remote document. If the input document doesn't match the expected state
     * (e.g. it is invalid or outdated), the document type may transition to
     * unknown.
     *
     * @param mutation - The mutation to apply.
     * @param document - The document to mutate. The input document can be an
     *     invalid document if the client has no knowledge of the pre-mutation state
     *     of the document.
     * @param mutationResult - The result of applying the mutation from the backend.
     */ function __PRIVATE_mutationApplyToRemoteDocument(e, t, n) {
        e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToRemoteDocument(e, t, n) {
            // Unlike setMutationApplyToLocalView, if we're applying a mutation to a
            // remote document the server has accepted the mutation so the precondition
            // must have held.
            const r = e.value.clone(), i = __PRIVATE_serverTransformResults(e.fieldTransforms, t, n.transformResults);
            r.setAll(i), t.convertToFoundDocument(n.version, r).setHasCommittedMutations();
        }(e, t, n) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToRemoteDocument(e, t, n) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) 
            // Since the mutation was not rejected, we know that the precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and convert to an UnknownDocument with a
            // known updateTime.
            return void t.convertToUnknownDocument(n.version);
            const r = __PRIVATE_serverTransformResults(e.fieldTransforms, t, n.transformResults), i = t.data;
            i.setAll(__PRIVATE_getPatch(e)), i.setAll(r), t.convertToFoundDocument(n.version, i).setHasCommittedMutations();
        }(e, t, n) : function __PRIVATE_deleteMutationApplyToRemoteDocument(e, t, n) {
            // Unlike applyToLocalView, if we're applying a mutation to a remote
            // document the server has accepted the mutation so the precondition must
            // have held.
            t.convertToNoDocument(n.version).setHasCommittedMutations();
        }(0, t, n);
    }

    /**
     * Applies this mutation to the given document for the purposes of computing
     * the new local view of a document. If the input document doesn't match the
     * expected state, the document is not modified.
     *
     * @param mutation - The mutation to apply.
     * @param document - The document to mutate. The input document can be an
     *     invalid document if the client has no knowledge of the pre-mutation state
     *     of the document.
     * @param previousMask - The fields that have been updated before applying this mutation.
     * @param localWriteTime - A timestamp indicating the local write time of the
     *     batch this mutation is a part of.
     * @returns A `FieldMask` representing the fields that are changed by applying this mutation.
     */ function __PRIVATE_mutationApplyToLocalView(e, t, n, r) {
        return e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToLocalView(e, t, n, r) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) 
            // The mutation failed to apply (e.g. a document ID created with add()
            // caused a name collision).
            return n;
            const i = e.value.clone(), s = __PRIVATE_localTransformResults(e.fieldTransforms, r, t);
            return i.setAll(s), t.convertToFoundDocument(t.version, i).setHasLocalMutations(), 
            null;
     // SetMutation overwrites all fields.
            }
        /**
     * A mutation that modifies fields of the document at the given key with the
     * given values. The values are applied through a field mask:
     *
     *  * When a field is in both the mask and the values, the corresponding field
     *    is updated.
     *  * When a field is in neither the mask nor the values, the corresponding
     *    field is unmodified.
     *  * When a field is in the mask but not in the values, the corresponding field
     *    is deleted.
     *  * When a field is not in the mask but is in the values, the values map is
     *    ignored.
     */ (e, t, n, r) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToLocalView(e, t, n, r) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) return n;
            const i = __PRIVATE_localTransformResults(e.fieldTransforms, r, t), s = t.data;
            if (s.setAll(__PRIVATE_getPatch(e)), s.setAll(i), t.convertToFoundDocument(t.version, s).setHasLocalMutations(), 
            null === n) return null;
            return n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map((e => e.field)));
        }
        /**
     * Returns a FieldPath/Value map with the content of the PatchMutation.
     */ (e, t, n, r) : function __PRIVATE_deleteMutationApplyToLocalView(e, t, n) {
            if (__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) return t.convertToNoDocument(t.version).setHasLocalMutations(), 
            null;
            return n;
        }
        /**
     * A mutation that verifies the existence of the document at the given key with
     * the provided precondition.
     *
     * The `verify` operation is only used in Transactions, and this class serves
     * primarily to facilitate serialization into protos.
     */ (e, t, n);
    }

    /**
     * If this mutation is not idempotent, returns the base value to persist with
     * this mutation. If a base value is returned, the mutation is always applied
     * to this base value, even if document has already been updated.
     *
     * The base value is a sparse object that consists of only the document
     * fields for which this mutation contains a non-idempotent transformation
     * (e.g. a numeric increment). The provided value guarantees consistent
     * behavior for non-idempotent transforms and allow us to return the same
     * latency-compensated value even if the backend has already applied the
     * mutation. The base value is null for idempotent mutations, as they can be
     * re-played even if the backend has already applied them.
     *
     * @returns a base value to store along with the mutation, or null for
     * idempotent mutations.
     */ function __PRIVATE_mutationExtractBaseValue(e, t) {
        let n = null;
        for (const r of e.fieldTransforms) {
            const e = t.data.field(r.field), i = __PRIVATE_computeTransformOperationBaseValue(r.transform, e || null);
            null != i && (null === n && (n = ObjectValue.empty()), n.set(r.field, i));
        }
        return n || null;
    }

    function __PRIVATE_mutationEquals(e, t) {
        return e.type === t.type && (!!e.key.isEqual(t.key) && (!!e.precondition.isEqual(t.precondition) && (!!function __PRIVATE_fieldTransformsAreEqual(e, t) {
            return void 0 === e && void 0 === t || !(!e || !t) && __PRIVATE_arrayEquals(e, t, ((e, t) => __PRIVATE_fieldTransformEquals(e, t)));
        }(e.fieldTransforms, t.fieldTransforms) && (0 /* MutationType.Set */ === e.type ? e.value.isEqual(t.value) : 1 /* MutationType.Patch */ !== e.type || e.data.isEqual(t.data) && e.fieldMask.isEqual(t.fieldMask)))));
    }

    /**
     * A mutation that creates or replaces the document at the given key with the
     * object value contents.
     */ class __PRIVATE_SetMutation extends Mutation {
        constructor(e, t, n, r = []) {
            super(), this.key = e, this.value = t, this.precondition = n, this.fieldTransforms = r, 
            this.type = 0 /* MutationType.Set */;
        }
        getFieldMask() {
            return null;
        }
    }

    class __PRIVATE_PatchMutation extends Mutation {
        constructor(e, t, n, r, i = []) {
            super(), this.key = e, this.data = t, this.fieldMask = n, this.precondition = r, 
            this.fieldTransforms = i, this.type = 1 /* MutationType.Patch */;
        }
        getFieldMask() {
            return this.fieldMask;
        }
    }

    function __PRIVATE_getPatch(e) {
        const t = new Map;
        return e.fieldMask.fields.forEach((n => {
            if (!n.isEmpty()) {
                const r = e.data.field(n);
                t.set(n, r);
            }
        })), t;
    }

    /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use after a mutation
     * containing transforms has been acknowledged by the server.
     *
     * @param fieldTransforms - The field transforms to apply the result to.
     * @param mutableDocument - The current state of the document after applying all
     * previous mutations.
     * @param serverTransformResults - The transform results received by the server.
     * @returns The transform results list.
     */ function __PRIVATE_serverTransformResults(e, t, n) {
        const r = new Map;
        __PRIVATE_hardAssert(e.length === n.length);
        for (let i = 0; i < n.length; i++) {
            const s = e[i], o = s.transform, _ = t.data.field(s.field);
            r.set(s.field, __PRIVATE_applyTransformOperationToRemoteDocument(o, _, n[i]));
        }
        return r;
    }

    /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use when applying a
     * transform locally.
     *
     * @param fieldTransforms - The field transforms to apply the result to.
     * @param localWriteTime - The local time of the mutation (used to
     *     generate ServerTimestampValues).
     * @param mutableDocument - The document to apply transforms on.
     * @returns The transform results list.
     */ function __PRIVATE_localTransformResults(e, t, n) {
        const r = new Map;
        for (const i of e) {
            const e = i.transform, s = n.data.field(i.field);
            r.set(i.field, __PRIVATE_applyTransformOperationToLocalView(e, s, t));
        }
        return r;
    }

    /** A mutation that deletes the document at the given key. */ class __PRIVATE_DeleteMutation extends Mutation {
        constructor(e, t) {
            super(), this.key = e, this.precondition = t, this.type = 2 /* MutationType.Delete */ , 
            this.fieldTransforms = [];
        }
        getFieldMask() {
            return null;
        }
    }

    class __PRIVATE_VerifyMutation extends Mutation {
        constructor(e, t) {
            super(), this.key = e, this.precondition = t, this.type = 3 /* MutationType.Verify */ , 
            this.fieldTransforms = [];
        }
        getFieldMask() {
            return null;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A batch of mutations that will be sent as one unit to the backend.
     */ class MutationBatch {
        /**
         * @param batchId - The unique ID of this mutation batch.
         * @param localWriteTime - The original write time of this mutation.
         * @param baseMutations - Mutations that are used to populate the base
         * values when this mutation is applied locally. This can be used to locally
         * overwrite values that are persisted in the remote document cache. Base
         * mutations are never sent to the backend.
         * @param mutations - The user-provided mutations in this mutation batch.
         * User-provided mutations are applied both locally and remotely on the
         * backend.
         */
        constructor(e, t, n, r) {
            this.batchId = e, this.localWriteTime = t, this.baseMutations = n, this.mutations = r;
        }
        /**
         * Applies all the mutations in this MutationBatch to the specified document
         * to compute the state of the remote document
         *
         * @param document - The document to apply mutations to.
         * @param batchResult - The result of applying the MutationBatch to the
         * backend.
         */    applyToRemoteDocument(e, t) {
            const n = t.mutationResults;
            for (let t = 0; t < this.mutations.length; t++) {
                const r = this.mutations[t];
                if (r.key.isEqual(e.key)) {
                    __PRIVATE_mutationApplyToRemoteDocument(r, e, n[t]);
                }
            }
        }
        /**
         * Computes the local view of a document given all the mutations in this
         * batch.
         *
         * @param document - The document to apply mutations to.
         * @param mutatedFields - Fields that have been updated before applying this mutation batch.
         * @returns A `FieldMask` representing all the fields that are mutated.
         */    applyToLocalView(e, t) {
            // First, apply the base state. This allows us to apply non-idempotent
            // transform against a consistent set of values.
            for (const n of this.baseMutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
            // Second, apply all user-provided mutations.
                    for (const n of this.mutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
            return t;
        }
        /**
         * Computes the local view for all provided documents given the mutations in
         * this batch. Returns a `DocumentKey` to `Mutation` map which can be used to
         * replace all the mutation applications.
         */    applyToLocalDocumentSet(e, t) {
            // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
            // directly (as done in `applyToLocalView()`), we can reduce the complexity
            // to O(n).
            const n = __PRIVATE_newMutationMap();
            return this.mutations.forEach((r => {
                const i = e.get(r.key), s = i.overlayedDocument;
                // TODO(mutabledocuments): This method should take a MutableDocumentMap
                // and we should remove this cast.
                            let o = this.applyToLocalView(s, i.mutatedFields);
                // Set mutatedFields to null if the document is only from local mutations.
                // This creates a Set or Delete mutation, instead of trying to create a
                // patch mutation as the overlay.
                            o = t.has(r.key) ? null : o;
                const _ = __PRIVATE_calculateOverlayMutation(s, o);
                null !== _ && n.set(r.key, _), s.isValidDocument() || s.convertToNoDocument(SnapshotVersion.min());
            })), n;
        }
        keys() {
            return this.mutations.reduce(((e, t) => e.add(t.key)), __PRIVATE_documentKeySet());
        }
        isEqual(e) {
            return this.batchId === e.batchId && __PRIVATE_arrayEquals(this.mutations, e.mutations, ((e, t) => __PRIVATE_mutationEquals(e, t))) && __PRIVATE_arrayEquals(this.baseMutations, e.baseMutations, ((e, t) => __PRIVATE_mutationEquals(e, t)));
        }
    }

    /** The result of applying a mutation batch to the backend. */ class MutationBatchResult {
        constructor(e, t, n, 
        /**
         * A pre-computed mapping from each mutated document to the resulting
         * version.
         */
        r) {
            this.batch = e, this.commitVersion = t, this.mutationResults = n, this.docVersions = r;
        }
        /**
         * Creates a new MutationBatchResult for the given batch and results. There
         * must be one result for each mutation in the batch. This static factory
         * caches a document=&gt;version mapping (docVersions).
         */    static from(e, t, n) {
            __PRIVATE_hardAssert(e.mutations.length === n.length);
            let r = function __PRIVATE_documentVersionMap() {
                return se;
            }();
            const i = e.mutations;
            for (let e = 0; e < i.length; e++) r = r.insert(i[e].key, n[e].version);
            return new MutationBatchResult(e, t, n, r);
        }
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Representation of an overlay computed by Firestore.
     *
     * Holds information about a mutation and the largest batch id in Firestore when
     * the mutation was created.
     */ class Overlay {
        constructor(e, t) {
            this.largestBatchId = e, this.mutation = t;
        }
        getKey() {
            return this.mutation.key;
        }
        isEqual(e) {
            return null !== e && this.mutation === e.mutation;
        }
        toString() {
            return `Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Error Codes describing the different ways GRPC can fail. These are copied
     * directly from GRPC's sources here:
     *
     * https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
     *
     * Important! The names of these identifiers matter because the string forms
     * are used for reverse lookups from the webchannel stream. Do NOT change the
     * names of these identifiers or change this into a const enum.
     */ var ae, ue;

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a non-write operation.
     *
     * See isPermanentWriteError for classifying write errors.
     */
    function __PRIVATE_isPermanentError(e) {
        switch (e) {
          default:
            return fail();

          case D.CANCELLED:
          case D.UNKNOWN:
          case D.DEADLINE_EXCEEDED:
          case D.RESOURCE_EXHAUSTED:
          case D.INTERNAL:
          case D.UNAVAILABLE:
     // Unauthenticated means something went wrong with our token and we need
            // to retry with new credentials which will happen automatically.
                  case D.UNAUTHENTICATED:
            return !1;

          case D.INVALID_ARGUMENT:
          case D.NOT_FOUND:
          case D.ALREADY_EXISTS:
          case D.PERMISSION_DENIED:
          case D.FAILED_PRECONDITION:
     // Aborted might be retried in some scenarios, but that is dependant on
            // the context and should handled individually by the calling code.
            // See https://cloud.google.com/apis/design/errors.
                  case D.ABORTED:
          case D.OUT_OF_RANGE:
          case D.UNIMPLEMENTED:
          case D.DATA_LOSS:
            return !0;
        }
    }

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a write operation.
     *
     * Write operations must be handled specially because as of b/119437764, ABORTED
     * errors on the write stream should be retried too (even though ABORTED errors
     * are not generally retryable).
     *
     * Note that during the initial handshake on the write stream an ABORTED error
     * signals that we should discard our stream token (i.e. it is permanent). This
     * means a handshake error should be classified with isPermanentError, above.
     */
    /**
     * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
     * are not the same as HTTP status codes.
     *
     * @returns The Code equivalent to the given GRPC status code. Fails if there
     *     is no match.
     */
    function __PRIVATE_mapCodeFromRpcCode(e) {
        if (void 0 === e) 
        // This shouldn't normally happen, but in certain error cases (like trying
        // to send invalid proto messages) we may get an error with no GRPC code.
        return __PRIVATE_logError("GRPC error has no .code"), D.UNKNOWN;
        switch (e) {
          case ae.OK:
            return D.OK;

          case ae.CANCELLED:
            return D.CANCELLED;

          case ae.UNKNOWN:
            return D.UNKNOWN;

          case ae.DEADLINE_EXCEEDED:
            return D.DEADLINE_EXCEEDED;

          case ae.RESOURCE_EXHAUSTED:
            return D.RESOURCE_EXHAUSTED;

          case ae.INTERNAL:
            return D.INTERNAL;

          case ae.UNAVAILABLE:
            return D.UNAVAILABLE;

          case ae.UNAUTHENTICATED:
            return D.UNAUTHENTICATED;

          case ae.INVALID_ARGUMENT:
            return D.INVALID_ARGUMENT;

          case ae.NOT_FOUND:
            return D.NOT_FOUND;

          case ae.ALREADY_EXISTS:
            return D.ALREADY_EXISTS;

          case ae.PERMISSION_DENIED:
            return D.PERMISSION_DENIED;

          case ae.FAILED_PRECONDITION:
            return D.FAILED_PRECONDITION;

          case ae.ABORTED:
            return D.ABORTED;

          case ae.OUT_OF_RANGE:
            return D.OUT_OF_RANGE;

          case ae.UNIMPLEMENTED:
            return D.UNIMPLEMENTED;

          case ae.DATA_LOSS:
            return D.DATA_LOSS;

          default:
            return fail();
        }
    }

    /**
     * Converts an HTTP response's error status to the equivalent error code.
     *
     * @param status - An HTTP error response status ("FAILED_PRECONDITION",
     * "UNKNOWN", etc.)
     * @returns The equivalent Code. Non-matching responses are mapped to
     *     Code.UNKNOWN.
     */ (ue = ae || (ae = {}))[ue.OK = 0] = "OK", ue[ue.CANCELLED = 1] = "CANCELLED", 
    ue[ue.UNKNOWN = 2] = "UNKNOWN", ue[ue.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
    ue[ue.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", ue[ue.NOT_FOUND = 5] = "NOT_FOUND", 
    ue[ue.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", ue[ue.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
    ue[ue.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", ue[ue.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
    ue[ue.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", ue[ue.ABORTED = 10] = "ABORTED", 
    ue[ue.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", ue[ue.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
    ue[ue.INTERNAL = 13] = "INTERNAL", ue[ue.UNAVAILABLE = 14] = "UNAVAILABLE", ue[ue.DATA_LOSS = 15] = "DATA_LOSS";

    /**
     * An instance of the Platform's 'TextDecoder' implementation.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    new Integer([ 4294967295, 4294967295 ], 0);

    /**
     * This class generates JsonObject values for the Datastore API suitable for
     * sending to either GRPC stub methods or via the JSON/HTTP REST API.
     *
     * The serializer supports both Protobuf.js and Proto3 JSON formats. By
     * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
     * format.
     *
     * For a description of the Proto3 JSON format check
     * https://developers.google.com/protocol-buffers/docs/proto3#json
     *
     * TODO(klimt): We can remove the databaseId argument if we keep the full
     * resource name in documents.
     */
    class JsonProtoSerializer {
        constructor(e, t) {
            this.databaseId = e, this.useProto3Json = t;
        }
    }

    /**
     * Returns a number (or null) from a google.protobuf.Int32Value proto.
     */
    /**
     * Returns a value for a Date that's appropriate to put into a proto.
     */
    function toTimestamp(e, t) {
        if (e.useProto3Json) {
            return `${new Date(1e3 * t.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + t.nanoseconds).slice(-9)}Z`;
        }
        return {
            seconds: "" + t.seconds,
            nanos: t.nanoseconds
        };
    }

    /**
     * Returns a value for bytes that's appropriate to put in a proto.
     *
     * Visible for testing.
     */
    function __PRIVATE_toBytes(e, t) {
        return e.useProto3Json ? t.toBase64() : t.toUint8Array();
    }

    /**
     * Returns a ByteString based on the proto string value.
     */ function __PRIVATE_toVersion(e, t) {
        return toTimestamp(e, t.toTimestamp());
    }

    function __PRIVATE_fromVersion(e) {
        return __PRIVATE_hardAssert(!!e), SnapshotVersion.fromTimestamp(function fromTimestamp(e) {
            const t = __PRIVATE_normalizeTimestamp(e);
            return new Timestamp(t.seconds, t.nanos);
        }(e));
    }

    function __PRIVATE_toResourceName(e, t) {
        return function __PRIVATE_fullyQualifiedPrefixPath(e) {
            return new ResourcePath([ "projects", e.projectId, "databases", e.database ]);
        }(e).child("documents").child(t).canonicalString();
    }

    function __PRIVATE_fromResourceName(e) {
        const t = ResourcePath.fromString(e);
        return __PRIVATE_hardAssert(__PRIVATE_isValidResourceName(t)), t;
    }

    function __PRIVATE_toName(e, t) {
        return __PRIVATE_toResourceName(e.databaseId, t.path);
    }

    function __PRIVATE_fromQueryPath(e) {
        const t = __PRIVATE_fromResourceName(e);
        // In v1beta1 queries for collections at the root did not have a trailing
        // "/documents". In v1 all resource paths contain "/documents". Preserve the
        // ability to read the v1beta1 form for compatibility with queries persisted
        // in the local target cache.
            return 4 === t.length ? ResourcePath.emptyPath() : __PRIVATE_extractLocalPathFromResourceName(t);
    }

    function __PRIVATE_getEncodedDatabaseId(e) {
        return new ResourcePath([ "projects", e.databaseId.projectId, "databases", e.databaseId.database ]).canonicalString();
    }

    function __PRIVATE_extractLocalPathFromResourceName(e) {
        return __PRIVATE_hardAssert(e.length > 4 && "documents" === e.get(4)), e.popFirst(5);
    }

    /** Creates a Document proto from key and fields (but no create/update time) */ function __PRIVATE_toMutationDocument(e, t, n) {
        return {
            name: __PRIVATE_toName(e, t),
            fields: n.value.mapValue.fields
        };
    }

    function toMutation(e, t) {
        let n;
        if (t instanceof __PRIVATE_SetMutation) n = {
            update: __PRIVATE_toMutationDocument(e, t.key, t.value)
        }; else if (t instanceof __PRIVATE_DeleteMutation) n = {
            delete: __PRIVATE_toName(e, t.key)
        }; else if (t instanceof __PRIVATE_PatchMutation) n = {
            update: __PRIVATE_toMutationDocument(e, t.key, t.data),
            updateMask: __PRIVATE_toDocumentMask(t.fieldMask)
        }; else {
            if (!(t instanceof __PRIVATE_VerifyMutation)) return fail();
            n = {
                verify: __PRIVATE_toName(e, t.key)
            };
        }
        return t.fieldTransforms.length > 0 && (n.updateTransforms = t.fieldTransforms.map((e => function __PRIVATE_toFieldTransform(e, t) {
            const n = t.transform;
            if (n instanceof __PRIVATE_ServerTimestampTransform) return {
                fieldPath: t.field.canonicalString(),
                setToServerValue: "REQUEST_TIME"
            };
            if (n instanceof __PRIVATE_ArrayUnionTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                appendMissingElements: {
                    values: n.elements
                }
            };
            if (n instanceof __PRIVATE_ArrayRemoveTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                removeAllFromArray: {
                    values: n.elements
                }
            };
            if (n instanceof __PRIVATE_NumericIncrementTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                increment: n.Te
            };
            throw fail();
        }(0, e)))), t.precondition.isNone || (n.currentDocument = function __PRIVATE_toPrecondition(e, t) {
            return void 0 !== t.updateTime ? {
                updateTime: __PRIVATE_toVersion(e, t.updateTime)
            } : void 0 !== t.exists ? {
                exists: t.exists
            } : fail();
        }(e, t.precondition)), n;
    }

    function __PRIVATE_fromWriteResults(e, t) {
        return e && e.length > 0 ? (__PRIVATE_hardAssert(void 0 !== t), e.map((e => function __PRIVATE_fromWriteResult(e, t) {
            // NOTE: Deletes don't have an updateTime.
            let n = e.updateTime ? __PRIVATE_fromVersion(e.updateTime) : __PRIVATE_fromVersion(t);
            return n.isEqual(SnapshotVersion.min()) && (
            // The Firestore Emulator currently returns an update time of 0 for
            // deletes of non-existing documents (rather than null). This breaks the
            // test "get deleted doc while offline with source=cache" as NoDocuments
            // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
            // TODO(#2149): Remove this when Emulator is fixed
            n = __PRIVATE_fromVersion(t)), new MutationResult(n, e.transformResults || []);
        }(e, t)))) : [];
    }

    function __PRIVATE_convertQueryTargetToQuery(e) {
        let t = __PRIVATE_fromQueryPath(e.parent);
        const n = e.structuredQuery, r = n.from ? n.from.length : 0;
        let i = null;
        if (r > 0) {
            __PRIVATE_hardAssert(1 === r);
            const e = n.from[0];
            e.allDescendants ? i = e.collectionId : t = t.child(e.collectionId);
        }
        let s = [];
        n.where && (s = function __PRIVATE_fromFilters(e) {
            const t = __PRIVATE_fromFilter(e);
            if (t instanceof CompositeFilter && __PRIVATE_compositeFilterIsFlatConjunction(t)) return t.getFilters();
            return [ t ];
        }(n.where));
        let o = [];
        n.orderBy && (o = function __PRIVATE_fromOrder(e) {
            return e.map((e => function __PRIVATE_fromPropertyOrder(e) {
                return new OrderBy(__PRIVATE_fromFieldPathReference(e.field), 
                // visible for testing
                function __PRIVATE_fromDirection(e) {
                    switch (e) {
                      case "ASCENDING":
                        return "asc" /* Direction.ASCENDING */;

                      case "DESCENDING":
                        return "desc" /* Direction.DESCENDING */;

                      default:
                        return;
                    }
                }
                // visible for testing
                (e.direction));
            }
            // visible for testing
            (e)));
        }(n.orderBy));
        let _ = null;
        n.limit && (_ = function __PRIVATE_fromInt32Proto(e) {
            let t;
            return t = "object" == typeof e ? e.value : e, __PRIVATE_isNullOrUndefined(t) ? null : t;
        }(n.limit));
        let a = null;
        n.startAt && (a = function __PRIVATE_fromStartAtCursor(e) {
            const t = !!e.before, n = e.values || [];
            return new Bound(n, t);
        }(n.startAt));
        let u = null;
        return n.endAt && (u = function __PRIVATE_fromEndAtCursor(e) {
            const t = !e.before, n = e.values || [];
            return new Bound(n, t);
        }
        // visible for testing
        (n.endAt)), __PRIVATE_newQuery(t, i, o, s, _, "F" /* LimitType.First */ , a, u);
    }

    function __PRIVATE_fromFilter(e) {
        return void 0 !== e.unaryFilter ? function __PRIVATE_fromUnaryFilter(e) {
            switch (e.unaryFilter.op) {
              case "IS_NAN":
                const t = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(t, "==" /* Operator.EQUAL */ , {
                    doubleValue: NaN
                });

              case "IS_NULL":
                const n = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(n, "==" /* Operator.EQUAL */ , {
                    nullValue: "NULL_VALUE"
                });

              case "IS_NOT_NAN":
                const r = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(r, "!=" /* Operator.NOT_EQUAL */ , {
                    doubleValue: NaN
                });

              case "IS_NOT_NULL":
                const i = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(i, "!=" /* Operator.NOT_EQUAL */ , {
                    nullValue: "NULL_VALUE"
                });

              default:
                return fail();
            }
        }(e) : void 0 !== e.fieldFilter ? function __PRIVATE_fromFieldFilter(e) {
            return FieldFilter.create(__PRIVATE_fromFieldPathReference(e.fieldFilter.field), function __PRIVATE_fromOperatorName(e) {
                switch (e) {
                  case "EQUAL":
                    return "==" /* Operator.EQUAL */;

                  case "NOT_EQUAL":
                    return "!=" /* Operator.NOT_EQUAL */;

                  case "GREATER_THAN":
                    return ">" /* Operator.GREATER_THAN */;

                  case "GREATER_THAN_OR_EQUAL":
                    return ">=" /* Operator.GREATER_THAN_OR_EQUAL */;

                  case "LESS_THAN":
                    return "<" /* Operator.LESS_THAN */;

                  case "LESS_THAN_OR_EQUAL":
                    return "<=" /* Operator.LESS_THAN_OR_EQUAL */;

                  case "ARRAY_CONTAINS":
                    return "array-contains" /* Operator.ARRAY_CONTAINS */;

                  case "IN":
                    return "in" /* Operator.IN */;

                  case "NOT_IN":
                    return "not-in" /* Operator.NOT_IN */;

                  case "ARRAY_CONTAINS_ANY":
                    return "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */;

                  default:
                    return fail();
                }
            }(e.fieldFilter.op), e.fieldFilter.value);
        }(e) : void 0 !== e.compositeFilter ? function __PRIVATE_fromCompositeFilter(e) {
            return CompositeFilter.create(e.compositeFilter.filters.map((e => __PRIVATE_fromFilter(e))), function __PRIVATE_fromCompositeOperatorName(e) {
                switch (e) {
                  case "AND":
                    return "and" /* CompositeOperator.AND */;

                  case "OR":
                    return "or" /* CompositeOperator.OR */;

                  default:
                    return fail();
                }
            }(e.compositeFilter.op));
        }(e) : fail();
    }

    function __PRIVATE_fromFieldPathReference(e) {
        return FieldPath$1.fromServerFormat(e.fieldPath);
    }

    function __PRIVATE_toDocumentMask(e) {
        const t = [];
        return e.fields.forEach((e => t.push(e.canonicalString()))), {
            fieldPaths: t
        };
    }

    function __PRIVATE_isValidResourceName(e) {
        // Resource names have at least 4 components (project ID, database ID)
        return e.length >= 4 && "projects" === e.get(0) && "databases" === e.get(2);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Serializer for values stored in the LocalStore. */ class __PRIVATE_LocalSerializer {
        constructor(e) {
            this.ct = e;
        }
    }

    /**
     * Encodes a `BundledQuery` from bundle proto to a Query object.
     *
     * This reconstructs the original query used to build the bundle being loaded,
     * including features exists only in SDKs (for example: limit-to-last).
     */
    function __PRIVATE_fromBundledQuery(e) {
        const t = __PRIVATE_convertQueryTargetToQuery({
            parent: e.parent,
            structuredQuery: e.structuredQuery
        });
        return "LAST" === e.limitType ? __PRIVATE_queryWithLimit(t, t.limit, "L" /* LimitType.Last */) : t;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of IndexManager.
     */ class __PRIVATE_MemoryIndexManager {
        constructor() {
            this._n = new __PRIVATE_MemoryCollectionParentIndex;
        }
        addToCollectionParentIndex(e, t) {
            return this._n.add(t), PersistencePromise.resolve();
        }
        getCollectionParents(e, t) {
            return PersistencePromise.resolve(this._n.getEntries(t));
        }
        addFieldIndex(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        deleteFieldIndex(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        deleteAllFieldIndexes(e) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        createTargetIndexes(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        getDocumentsMatchingTarget(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(null);
        }
        getIndexType(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(0 /* IndexType.NONE */);
        }
        getFieldIndexes(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve([]);
        }
        getNextCollectionGroupToUpdate(e) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(null);
        }
        getMinOffset(e, t) {
            return PersistencePromise.resolve(IndexOffset.min());
        }
        getMinOffsetFromCollectionGroup(e, t) {
            return PersistencePromise.resolve(IndexOffset.min());
        }
        updateCollectionGroup(e, t, n) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        updateIndexEntries(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
    }

    /**
     * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
     * Also used for in-memory caching by IndexedDbIndexManager and initial index population
     * in indexeddb_schema.ts
     */ class __PRIVATE_MemoryCollectionParentIndex {
        constructor() {
            this.index = {};
        }
        // Returns false if the entry already existed.
        add(e) {
            const t = e.lastSegment(), n = e.popLast(), r = this.index[t] || new SortedSet(ResourcePath.comparator), i = !r.has(n);
            return this.index[t] = r.add(n), i;
        }
        has(e) {
            const t = e.lastSegment(), n = e.popLast(), r = this.index[t];
            return r && r.has(n);
        }
        getEntries(e) {
            return (this.index[e] || new SortedSet(ResourcePath.comparator)).toArray();
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Offset to ensure non-overlapping target ids. */
    /**
     * Generates monotonically increasing target IDs for sending targets to the
     * watch stream.
     *
     * The client constructs two generators, one for the target cache, and one for
     * for the sync engine (to generate limbo documents targets). These
     * generators produce non-overlapping IDs (by using even and odd IDs
     * respectively).
     *
     * By separating the target ID space, the query cache can generate target IDs
     * that persist across client restarts, while sync engine can independently
     * generate in-memory target IDs that are transient and can be reused after a
     * restart.
     */
    class __PRIVATE_TargetIdGenerator {
        constructor(e) {
            this.On = e;
        }
        next() {
            return this.On += 2, this.On;
        }
        static Nn() {
            // The target cache generator must return '2' in its first call to `next()`
            // as there is no differentiation in the protocol layer between an unset
            // number and the number '0'. If we were to sent a target with target ID
            // '0', the backend would consider it unset and replace it with its own ID.
            return new __PRIVATE_TargetIdGenerator(0);
        }
        static Bn() {
            // Sync engine assigns target IDs for limbo document detection.
            return new __PRIVATE_TargetIdGenerator(-1);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory buffer of entries to be written to a RemoteDocumentCache.
     * It can be used to batch up a set of changes to be written to the cache, but
     * additionally supports reading entries back with the `getEntry()` method,
     * falling back to the underlying RemoteDocumentCache if no entry is
     * buffered.
     *
     * Entries added to the cache *must* be read first. This is to facilitate
     * calculating the size delta of the pending changes.
     *
     * PORTING NOTE: This class was implemented then removed from other platforms.
     * If byte-counting ends up being needed on the other platforms, consider
     * porting this class as part of that implementation work.
     */ class RemoteDocumentChangeBuffer {
        constructor() {
            // A mapping of document key to the new cache entry that should be written.
            this.changes = new ObjectMap((e => e.toString()), ((e, t) => e.isEqual(t))), this.changesApplied = !1;
        }
        /**
         * Buffers a `RemoteDocumentCache.addEntry()` call.
         *
         * You can only modify documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */    addEntry(e) {
            this.assertNotApplied(), this.changes.set(e.key, e);
        }
        /**
         * Buffers a `RemoteDocumentCache.removeEntry()` call.
         *
         * You can only remove documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */    removeEntry(e, t) {
            this.assertNotApplied(), this.changes.set(e, MutableDocument.newInvalidDocument(e).setReadTime(t));
        }
        /**
         * Looks up an entry in the cache. The buffered changes will first be checked,
         * and if no buffered change applies, this will forward to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction - The transaction in which to perform any persistence
         *     operations.
         * @param documentKey - The key of the entry to look up.
         * @returns The cached document or an invalid document if we have nothing
         * cached.
         */    getEntry(e, t) {
            this.assertNotApplied();
            const n = this.changes.get(t);
            return void 0 !== n ? PersistencePromise.resolve(n) : this.getFromCache(e, t);
        }
        /**
         * Looks up several entries in the cache, forwarding to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction - The transaction in which to perform any persistence
         *     operations.
         * @param documentKeys - The keys of the entries to look up.
         * @returns A map of cached documents, indexed by key. If an entry cannot be
         *     found, the corresponding key will be mapped to an invalid document.
         */    getEntries(e, t) {
            return this.getAllFromCache(e, t);
        }
        /**
         * Applies buffered changes to the underlying RemoteDocumentCache, using
         * the provided transaction.
         */    apply(e) {
            return this.assertNotApplied(), this.changesApplied = !0, this.applyChanges(e);
        }
        /** Helper to assert this.changes is not null  */    assertNotApplied() {}
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Schema Version for the Web client:
     * 1.  Initial version including Mutation Queue, Query Cache, and Remote
     *     Document Cache
     * 2.  Used to ensure a targetGlobal object exists and add targetCount to it. No
     *     longer required because migration 3 unconditionally clears it.
     * 3.  Dropped and re-created Query Cache to deal with cache corruption related
     *     to limbo resolution. Addresses
     *     https://github.com/firebase/firebase-ios-sdk/issues/1548
     * 4.  Multi-Tab Support.
     * 5.  Removal of held write acks.
     * 6.  Create document global for tracking document cache size.
     * 7.  Ensure every cached document has a sentinel row with a sequence number.
     * 8.  Add collection-parent index for Collection Group queries.
     * 9.  Change RemoteDocumentChanges store to be keyed by readTime rather than
     *     an auto-incrementing ID. This is required for Index-Free queries.
     * 10. Rewrite the canonical IDs to the explicit Protobuf-based format.
     * 11. Add bundles and named_queries for bundle support.
     * 12. Add document overlays.
     * 13. Rewrite the keys of the remote document cache to allow for efficient
     *     document lookup via `getAll()`.
     * 14. Add overlays.
     * 15. Add indexing support.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a local view (overlay) of a document, and the fields that are
     * locally mutated.
     */
    class OverlayedDocument {
        constructor(e, 
        /**
         * The fields that are locally mutated by patch mutations.
         *
         * If the overlayed	document is from set or delete mutations, this is `null`.
         * If there is no overlay (mutation) for the document, this is an empty `FieldMask`.
         */
        t) {
            this.overlayedDocument = e, this.mutatedFields = t;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A readonly view of the local state of all documents we're tracking (i.e. we
     * have a cached version in remoteDocumentCache or local mutations for the
     * document). The view is computed by applying the mutations in the
     * MutationQueue to the RemoteDocumentCache.
     */ class LocalDocumentsView {
        constructor(e, t, n, r) {
            this.remoteDocumentCache = e, this.mutationQueue = t, this.documentOverlayCache = n, 
            this.indexManager = r;
        }
        /**
         * Get the local view of the document identified by `key`.
         *
         * @returns Local view of the document or null if we don't have any cached
         * state for it.
         */    getDocument(e, t) {
            let n = null;
            return this.documentOverlayCache.getOverlay(e, t).next((r => (n = r, this.remoteDocumentCache.getEntry(e, t)))).next((e => (null !== n && __PRIVATE_mutationApplyToLocalView(n.mutation, e, FieldMask.empty(), Timestamp.now()), 
            e)));
        }
        /**
         * Gets the local view of the documents identified by `keys`.
         *
         * If we don't have cached state for a document in `keys`, a NoDocument will
         * be stored for that key in the resulting set.
         */    getDocuments(e, t) {
            return this.remoteDocumentCache.getEntries(e, t).next((t => this.getLocalViewOfDocuments(e, t, __PRIVATE_documentKeySet()).next((() => t))));
        }
        /**
         * Similar to `getDocuments`, but creates the local view from the given
         * `baseDocs` without retrieving documents from the local store.
         *
         * @param transaction - The transaction this operation is scoped to.
         * @param docs - The documents to apply local mutations to get the local views.
         * @param existenceStateChanged - The set of document keys whose existence state
         *   is changed. This is useful to determine if some documents overlay needs
         *   to be recalculated.
         */    getLocalViewOfDocuments(e, t, n = __PRIVATE_documentKeySet()) {
            const r = __PRIVATE_newOverlayMap();
            return this.populateOverlays(e, r, t).next((() => this.computeViews(e, t, r, n).next((e => {
                let t = documentMap();
                return e.forEach(((e, n) => {
                    t = t.insert(e, n.overlayedDocument);
                })), t;
            }))));
        }
        /**
         * Gets the overlayed documents for the given document map, which will include
         * the local view of those documents and a `FieldMask` indicating which fields
         * are mutated locally, `null` if overlay is a Set or Delete mutation.
         */    getOverlayedDocuments(e, t) {
            const n = __PRIVATE_newOverlayMap();
            return this.populateOverlays(e, n, t).next((() => this.computeViews(e, t, n, __PRIVATE_documentKeySet())));
        }
        /**
         * Fetches the overlays for {@code docs} and adds them to provided overlay map
         * if the map does not already contain an entry for the given document key.
         */    populateOverlays(e, t, n) {
            const r = [];
            return n.forEach((e => {
                t.has(e) || r.push(e);
            })), this.documentOverlayCache.getOverlays(e, r).next((e => {
                e.forEach(((e, n) => {
                    t.set(e, n);
                }));
            }));
        }
        /**
         * Computes the local view for the given documents.
         *
         * @param docs - The documents to compute views for. It also has the base
         *   version of the documents.
         * @param overlays - The overlays that need to be applied to the given base
         *   version of the documents.
         * @param existenceStateChanged - A set of documents whose existence states
         *   might have changed. This is used to determine if we need to re-calculate
         *   overlays from mutation queues.
         * @return A map represents the local documents view.
         */    computeViews(e, t, n, r) {
            let i = __PRIVATE_mutableDocumentMap();
            const s = __PRIVATE_newDocumentKeyMap(), o = function __PRIVATE_newOverlayedDocumentMap() {
                return __PRIVATE_newDocumentKeyMap();
            }();
            return t.forEach(((e, t) => {
                const o = n.get(t.key);
                // Recalculate an overlay if the document's existence state changed due to
                // a remote event *and* the overlay is a PatchMutation. This is because
                // document existence state can change if some patch mutation's
                // preconditions are met.
                // NOTE: we recalculate when `overlay` is undefined as well, because there
                // might be a patch mutation whose precondition does not match before the
                // change (hence overlay is undefined), but would now match.
                            r.has(t.key) && (void 0 === o || o.mutation instanceof __PRIVATE_PatchMutation) ? i = i.insert(t.key, t) : void 0 !== o ? (s.set(t.key, o.mutation.getFieldMask()), 
                __PRIVATE_mutationApplyToLocalView(o.mutation, t, o.mutation.getFieldMask(), Timestamp.now())) : 
                // no overlay exists
                // Using EMPTY to indicate there is no overlay for the document.
                s.set(t.key, FieldMask.empty());
            })), this.recalculateAndSaveOverlays(e, i).next((e => (e.forEach(((e, t) => s.set(e, t))), 
            t.forEach(((e, t) => {
                var n;
                return o.set(e, new OverlayedDocument(t, null !== (n = s.get(e)) && void 0 !== n ? n : null));
            })), o)));
        }
        recalculateAndSaveOverlays(e, t) {
            const n = __PRIVATE_newDocumentKeyMap();
            // A reverse lookup map from batch id to the documents within that batch.
                    let r = new SortedMap(((e, t) => e - t)), i = __PRIVATE_documentKeySet();
            return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e, t).next((e => {
                for (const i of e) i.keys().forEach((e => {
                    const s = t.get(e);
                    if (null === s) return;
                    let o = n.get(e) || FieldMask.empty();
                    o = i.applyToLocalView(s, o), n.set(e, o);
                    const _ = (r.get(i.batchId) || __PRIVATE_documentKeySet()).add(e);
                    r = r.insert(i.batchId, _);
                }));
            })).next((() => {
                const s = [], o = r.getReverseIterator();
                // Iterate in descending order of batch IDs, and skip documents that are
                // already saved.
                            for (;o.hasNext(); ) {
                    const r = o.getNext(), _ = r.key, a = r.value, u = __PRIVATE_newMutationMap();
                    a.forEach((e => {
                        if (!i.has(e)) {
                            const r = __PRIVATE_calculateOverlayMutation(t.get(e), n.get(e));
                            null !== r && u.set(e, r), i = i.add(e);
                        }
                    })), s.push(this.documentOverlayCache.saveOverlays(e, _, u));
                }
                return PersistencePromise.waitFor(s);
            })).next((() => n));
        }
        /**
         * Recalculates overlays by reading the documents from remote document cache
         * first, and saves them after they are calculated.
         */    recalculateAndSaveOverlaysForDocumentKeys(e, t) {
            return this.remoteDocumentCache.getEntries(e, t).next((t => this.recalculateAndSaveOverlays(e, t)));
        }
        /**
         * Performs a query against the local view of all documents.
         *
         * @param transaction - The persistence transaction.
         * @param query - The query to match documents against.
         * @param offset - Read time and key to start scanning by (exclusive).
         * @param context - A optional tracker to keep a record of important details
         *   during database local query execution.
         */    getDocumentsMatchingQuery(e, t, n, r) {
            /**
     * Returns whether the query matches a single document by path (rather than a
     * collection).
     */
            return function __PRIVATE_isDocumentQuery$1(e) {
                return DocumentKey.isDocumentKey(e.path) && null === e.collectionGroup && 0 === e.filters.length;
            }(t) ? this.getDocumentsMatchingDocumentQuery(e, t.path) : __PRIVATE_isCollectionGroupQuery(t) ? this.getDocumentsMatchingCollectionGroupQuery(e, t, n, r) : this.getDocumentsMatchingCollectionQuery(e, t, n, r);
        }
        /**
         * Given a collection group, returns the next documents that follow the provided offset, along
         * with an updated batch ID.
         *
         * <p>The documents returned by this method are ordered by remote version from the provided
         * offset. If there are no more remote documents after the provided offset, documents with
         * mutations in order of batch id from the offset are returned. Since all documents in a batch are
         * returned together, the total number of documents returned can exceed {@code count}.
         *
         * @param transaction
         * @param collectionGroup The collection group for the documents.
         * @param offset The offset to index into.
         * @param count The number of documents to return
         * @return A LocalWriteResult with the documents that follow the provided offset and the last processed batch id.
         */    getNextDocuments(e, t, n, r) {
            return this.remoteDocumentCache.getAllFromCollectionGroup(e, t, n, r).next((i => {
                const s = r - i.size > 0 ? this.documentOverlayCache.getOverlaysForCollectionGroup(e, t, n.largestBatchId, r - i.size) : PersistencePromise.resolve(__PRIVATE_newOverlayMap());
                // The callsite will use the largest batch ID together with the latest read time to create
                // a new index offset. Since we only process batch IDs if all remote documents have been read,
                // no overlay will increase the overall read time. This is why we only need to special case
                // the batch id.
                            let o = -1, _ = i;
                return s.next((t => PersistencePromise.forEach(t, ((t, n) => (o < n.largestBatchId && (o = n.largestBatchId), 
                i.get(t) ? PersistencePromise.resolve() : this.remoteDocumentCache.getEntry(e, t).next((e => {
                    _ = _.insert(t, e);
                }))))).next((() => this.populateOverlays(e, t, i))).next((() => this.computeViews(e, _, t, __PRIVATE_documentKeySet()))).next((e => ({
                    batchId: o,
                    changes: __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e)
                })))));
            }));
        }
        getDocumentsMatchingDocumentQuery(e, t) {
            // Just do a simple document lookup.
            return this.getDocument(e, new DocumentKey(t)).next((e => {
                let t = documentMap();
                return e.isFoundDocument() && (t = t.insert(e.key, e)), t;
            }));
        }
        getDocumentsMatchingCollectionGroupQuery(e, t, n, r) {
            const i = t.collectionGroup;
            let s = documentMap();
            return this.indexManager.getCollectionParents(e, i).next((o => PersistencePromise.forEach(o, (o => {
                const _ = function __PRIVATE_asCollectionQueryAtPath(e, t) {
                    return new __PRIVATE_QueryImpl(t, 
                    /*collectionGroup=*/ null, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, e.startAt, e.endAt);
                }(t, o.child(i));
                return this.getDocumentsMatchingCollectionQuery(e, _, n, r).next((e => {
                    e.forEach(((e, t) => {
                        s = s.insert(e, t);
                    }));
                }));
            })).next((() => s))));
        }
        getDocumentsMatchingCollectionQuery(e, t, n, r) {
            // Query the remote documents and overlay mutations.
            let i;
            return this.documentOverlayCache.getOverlaysForCollection(e, t.path, n.largestBatchId).next((s => (i = s, 
            this.remoteDocumentCache.getDocumentsMatchingQuery(e, t, n, i, r)))).next((e => {
                // As documents might match the query because of their overlay we need to
                // include documents for all overlays in the initial document set.
                i.forEach(((t, n) => {
                    const r = n.getKey();
                    null === e.get(r) && (e = e.insert(r, MutableDocument.newInvalidDocument(r)));
                }));
                // Apply the overlays and match against the query.
                let n = documentMap();
                return e.forEach(((e, r) => {
                    const s = i.get(e);
                    void 0 !== s && __PRIVATE_mutationApplyToLocalView(s.mutation, r, FieldMask.empty(), Timestamp.now()), 
                    // Finally, insert the documents that still match the query
                    __PRIVATE_queryMatches(t, r) && (n = n.insert(e, r));
                })), n;
            }));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryBundleCache {
        constructor(e) {
            this.serializer = e, this.cr = new Map, this.lr = new Map;
        }
        getBundleMetadata(e, t) {
            return PersistencePromise.resolve(this.cr.get(t));
        }
        saveBundleMetadata(e, t) {
            return this.cr.set(t.id, 
            /** Decodes a BundleMetadata proto into a BundleMetadata object. */
            function __PRIVATE_fromBundleMetadata(e) {
                return {
                    id: e.id,
                    version: e.version,
                    createTime: __PRIVATE_fromVersion(e.createTime)
                };
            }(t)), PersistencePromise.resolve();
        }
        getNamedQuery(e, t) {
            return PersistencePromise.resolve(this.lr.get(t));
        }
        saveNamedQuery(e, t) {
            return this.lr.set(t.name, function __PRIVATE_fromProtoNamedQuery(e) {
                return {
                    name: e.name,
                    query: __PRIVATE_fromBundledQuery(e.bundledQuery),
                    readTime: __PRIVATE_fromVersion(e.readTime)
                };
            }(t)), PersistencePromise.resolve();
        }
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of DocumentOverlayCache.
     */ class __PRIVATE_MemoryDocumentOverlayCache {
        constructor() {
            // A map sorted by DocumentKey, whose value is a pair of the largest batch id
            // for the overlay and the overlay itself.
            this.overlays = new SortedMap(DocumentKey.comparator), this.hr = new Map;
        }
        getOverlay(e, t) {
            return PersistencePromise.resolve(this.overlays.get(t));
        }
        getOverlays(e, t) {
            const n = __PRIVATE_newOverlayMap();
            return PersistencePromise.forEach(t, (t => this.getOverlay(e, t).next((e => {
                null !== e && n.set(t, e);
            })))).next((() => n));
        }
        saveOverlays(e, t, n) {
            return n.forEach(((n, r) => {
                this.ht(e, t, r);
            })), PersistencePromise.resolve();
        }
        removeOverlaysForBatchId(e, t, n) {
            const r = this.hr.get(n);
            return void 0 !== r && (r.forEach((e => this.overlays = this.overlays.remove(e))), 
            this.hr.delete(n)), PersistencePromise.resolve();
        }
        getOverlaysForCollection(e, t, n) {
            const r = __PRIVATE_newOverlayMap(), i = t.length + 1, s = new DocumentKey(t.child("")), o = this.overlays.getIteratorFrom(s);
            for (;o.hasNext(); ) {
                const e = o.getNext().value, s = e.getKey();
                if (!t.isPrefixOf(s.path)) break;
                // Documents from sub-collections
                            s.path.length === i && (e.largestBatchId > n && r.set(e.getKey(), e));
            }
            return PersistencePromise.resolve(r);
        }
        getOverlaysForCollectionGroup(e, t, n, r) {
            let i = new SortedMap(((e, t) => e - t));
            const s = this.overlays.getIterator();
            for (;s.hasNext(); ) {
                const e = s.getNext().value;
                if (e.getKey().getCollectionGroup() === t && e.largestBatchId > n) {
                    let t = i.get(e.largestBatchId);
                    null === t && (t = __PRIVATE_newOverlayMap(), i = i.insert(e.largestBatchId, t)), 
                    t.set(e.getKey(), e);
                }
            }
            const o = __PRIVATE_newOverlayMap(), _ = i.getIterator();
            for (;_.hasNext(); ) {
                if (_.getNext().value.forEach(((e, t) => o.set(e, t))), o.size() >= r) break;
            }
            return PersistencePromise.resolve(o);
        }
        ht(e, t, n) {
            // Remove the association of the overlay to its batch id.
            const r = this.overlays.get(n.key);
            if (null !== r) {
                const e = this.hr.get(r.largestBatchId).delete(n.key);
                this.hr.set(r.largestBatchId, e);
            }
            this.overlays = this.overlays.insert(n.key, new Overlay(t, n));
            // Create the association of this overlay to the given largestBatchId.
            let i = this.hr.get(t);
            void 0 === i && (i = __PRIVATE_documentKeySet(), this.hr.set(t, i)), this.hr.set(t, i.add(n.key));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A collection of references to a document from some kind of numbered entity
     * (either a target ID or batch ID). As references are added to or removed from
     * the set corresponding events are emitted to a registered garbage collector.
     *
     * Each reference is represented by a DocumentReference object. Each of them
     * contains enough information to uniquely identify the reference. They are all
     * stored primarily in a set sorted by key. A document is considered garbage if
     * there's no references in that set (this can be efficiently checked thanks to
     * sorting by key).
     *
     * ReferenceSet also keeps a secondary set that contains references sorted by
     * IDs. This one is used to efficiently implement removal of all references by
     * some target ID.
     */ class __PRIVATE_ReferenceSet {
        constructor() {
            // A set of outstanding references to a document sorted by key.
            this.Pr = new SortedSet(__PRIVATE_DocReference.Ir), 
            // A set of outstanding references to a document sorted by target id.
            this.Tr = new SortedSet(__PRIVATE_DocReference.Er);
        }
        /** Returns true if the reference set contains no references. */    isEmpty() {
            return this.Pr.isEmpty();
        }
        /** Adds a reference to the given document key for the given ID. */    addReference(e, t) {
            const n = new __PRIVATE_DocReference(e, t);
            this.Pr = this.Pr.add(n), this.Tr = this.Tr.add(n);
        }
        /** Add references to the given document keys for the given ID. */    dr(e, t) {
            e.forEach((e => this.addReference(e, t)));
        }
        /**
         * Removes a reference to the given document key for the given
         * ID.
         */    removeReference(e, t) {
            this.Ar(new __PRIVATE_DocReference(e, t));
        }
        Rr(e, t) {
            e.forEach((e => this.removeReference(e, t)));
        }
        /**
         * Clears all references with a given ID. Calls removeRef() for each key
         * removed.
         */    Vr(e) {
            const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1), i = [];
            return this.Tr.forEachInRange([ n, r ], (e => {
                this.Ar(e), i.push(e.key);
            })), i;
        }
        mr() {
            this.Pr.forEach((e => this.Ar(e)));
        }
        Ar(e) {
            this.Pr = this.Pr.delete(e), this.Tr = this.Tr.delete(e);
        }
        gr(e) {
            const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1);
            let i = __PRIVATE_documentKeySet();
            return this.Tr.forEachInRange([ n, r ], (e => {
                i = i.add(e.key);
            })), i;
        }
        containsKey(e) {
            const t = new __PRIVATE_DocReference(e, 0), n = this.Pr.firstAfterOrEqual(t);
            return null !== n && e.isEqual(n.key);
        }
    }

    class __PRIVATE_DocReference {
        constructor(e, t) {
            this.key = e, this.pr = t;
        }
        /** Compare by key then by ID */    static Ir(e, t) {
            return DocumentKey.comparator(e.key, t.key) || __PRIVATE_primitiveComparator(e.pr, t.pr);
        }
        /** Compare by ID then by key */    static Er(e, t) {
            return __PRIVATE_primitiveComparator(e.pr, t.pr) || DocumentKey.comparator(e.key, t.key);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryMutationQueue {
        constructor(e, t) {
            this.indexManager = e, this.referenceDelegate = t, 
            /**
             * The set of all mutations that have been sent but not yet been applied to
             * the backend.
             */
            this.mutationQueue = [], 
            /** Next value to use when assigning sequential IDs to each mutation batch. */
            this.yr = 1, 
            /** An ordered mapping between documents and the mutations batch IDs. */
            this.wr = new SortedSet(__PRIVATE_DocReference.Ir);
        }
        checkEmpty(e) {
            return PersistencePromise.resolve(0 === this.mutationQueue.length);
        }
        addMutationBatch(e, t, n, r) {
            const i = this.yr;
            this.yr++, this.mutationQueue.length > 0 && this.mutationQueue[this.mutationQueue.length - 1];
            const s = new MutationBatch(i, t, n, r);
            this.mutationQueue.push(s);
            // Track references by document key and index collection parents.
            for (const t of r) this.wr = this.wr.add(new __PRIVATE_DocReference(t.key, i)), 
            this.indexManager.addToCollectionParentIndex(e, t.key.path.popLast());
            return PersistencePromise.resolve(s);
        }
        lookupMutationBatch(e, t) {
            return PersistencePromise.resolve(this.Sr(t));
        }
        getNextMutationBatchAfterBatchId(e, t) {
            const n = t + 1, r = this.br(n), i = r < 0 ? 0 : r;
            // The requested batchId may still be out of range so normalize it to the
            // start of the queue.
                    return PersistencePromise.resolve(this.mutationQueue.length > i ? this.mutationQueue[i] : null);
        }
        getHighestUnacknowledgedBatchId() {
            return PersistencePromise.resolve(0 === this.mutationQueue.length ? -1 : this.yr - 1);
        }
        getAllMutationBatches(e) {
            return PersistencePromise.resolve(this.mutationQueue.slice());
        }
        getAllMutationBatchesAffectingDocumentKey(e, t) {
            const n = new __PRIVATE_DocReference(t, 0), r = new __PRIVATE_DocReference(t, Number.POSITIVE_INFINITY), i = [];
            return this.wr.forEachInRange([ n, r ], (e => {
                const t = this.Sr(e.pr);
                i.push(t);
            })), PersistencePromise.resolve(i);
        }
        getAllMutationBatchesAffectingDocumentKeys(e, t) {
            let n = new SortedSet(__PRIVATE_primitiveComparator);
            return t.forEach((e => {
                const t = new __PRIVATE_DocReference(e, 0), r = new __PRIVATE_DocReference(e, Number.POSITIVE_INFINITY);
                this.wr.forEachInRange([ t, r ], (e => {
                    n = n.add(e.pr);
                }));
            })), PersistencePromise.resolve(this.Dr(n));
        }
        getAllMutationBatchesAffectingQuery(e, t) {
            // Use the query path as a prefix for testing if a document matches the
            // query.
            const n = t.path, r = n.length + 1;
            // Construct a document reference for actually scanning the index. Unlike
            // the prefix the document key in this reference must have an even number of
            // segments. The empty segment can be used a suffix of the query path
            // because it precedes all other segments in an ordered traversal.
            let i = n;
            DocumentKey.isDocumentKey(i) || (i = i.child(""));
            const s = new __PRIVATE_DocReference(new DocumentKey(i), 0);
            // Find unique batchIDs referenced by all documents potentially matching the
            // query.
                    let o = new SortedSet(__PRIVATE_primitiveComparator);
            return this.wr.forEachWhile((e => {
                const t = e.key.path;
                return !!n.isPrefixOf(t) && (
                // Rows with document keys more than one segment longer than the query
                // path can't be matches. For example, a query on 'rooms' can't match
                // the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                t.length === r && (o = o.add(e.pr)), !0);
            }), s), PersistencePromise.resolve(this.Dr(o));
        }
        Dr(e) {
            // Construct an array of matching batches, sorted by batchID to ensure that
            // multiple mutations affecting the same document key are applied in order.
            const t = [];
            return e.forEach((e => {
                const n = this.Sr(e);
                null !== n && t.push(n);
            })), t;
        }
        removeMutationBatch(e, t) {
            __PRIVATE_hardAssert(0 === this.Cr(t.batchId, "removed")), this.mutationQueue.shift();
            let n = this.wr;
            return PersistencePromise.forEach(t.mutations, (r => {
                const i = new __PRIVATE_DocReference(r.key, t.batchId);
                return n = n.delete(i), this.referenceDelegate.markPotentiallyOrphaned(e, r.key);
            })).next((() => {
                this.wr = n;
            }));
        }
        Mn(e) {
            // No-op since the memory mutation queue does not maintain a separate cache.
        }
        containsKey(e, t) {
            const n = new __PRIVATE_DocReference(t, 0), r = this.wr.firstAfterOrEqual(n);
            return PersistencePromise.resolve(t.isEqual(r && r.key));
        }
        performConsistencyCheck(e) {
            return this.mutationQueue.length, PersistencePromise.resolve();
        }
        /**
         * Finds the index of the given batchId in the mutation queue and asserts that
         * the resulting index is within the bounds of the queue.
         *
         * @param batchId - The batchId to search for
         * @param action - A description of what the caller is doing, phrased in passive
         * form (e.g. "acknowledged" in a routine that acknowledges batches).
         */    Cr(e, t) {
            return this.br(e);
        }
        /**
         * Finds the index of the given batchId in the mutation queue. This operation
         * is O(1).
         *
         * @returns The computed index of the batch with the given batchId, based on
         * the state of the queue. Note this index can be negative if the requested
         * batchId has already been remvoed from the queue or past the end of the
         * queue if the batchId is larger than the last added batch.
         */    br(e) {
            if (0 === this.mutationQueue.length) 
            // As an index this is past the end of the queue
            return 0;
            // Examine the front of the queue to figure out the difference between the
            // batchId and indexes in the array. Note that since the queue is ordered
            // by batchId, if the first batch has a larger batchId then the requested
            // batchId doesn't exist in the queue.
                    return e - this.mutationQueue[0].batchId;
        }
        /**
         * A version of lookupMutationBatch that doesn't return a promise, this makes
         * other functions that uses this code easier to read and more efficent.
         */    Sr(e) {
            const t = this.br(e);
            if (t < 0 || t >= this.mutationQueue.length) return null;
            return this.mutationQueue[t];
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The memory-only RemoteDocumentCache for IndexedDb. To construct, invoke
     * `newMemoryRemoteDocumentCache()`.
     */
    class __PRIVATE_MemoryRemoteDocumentCacheImpl {
        /**
         * @param sizer - Used to assess the size of a document. For eager GC, this is
         * expected to just return 0 to avoid unnecessarily doing the work of
         * calculating the size.
         */
        constructor(e) {
            this.vr = e, 
            /** Underlying cache of documents and their read times. */
            this.docs = function __PRIVATE_documentEntryMap() {
                return new SortedMap(DocumentKey.comparator);
            }(), 
            /** Size of all cached documents. */
            this.size = 0;
        }
        setIndexManager(e) {
            this.indexManager = e;
        }
        /**
         * Adds the supplied entry to the cache and updates the cache size as appropriate.
         *
         * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */    addEntry(e, t) {
            const n = t.key, r = this.docs.get(n), i = r ? r.size : 0, s = this.vr(t);
            return this.docs = this.docs.insert(n, {
                document: t.mutableCopy(),
                size: s
            }), this.size += s - i, this.indexManager.addToCollectionParentIndex(e, n.path.popLast());
        }
        /**
         * Removes the specified entry from the cache and updates the cache size as appropriate.
         *
         * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */    removeEntry(e) {
            const t = this.docs.get(e);
            t && (this.docs = this.docs.remove(e), this.size -= t.size);
        }
        getEntry(e, t) {
            const n = this.docs.get(t);
            return PersistencePromise.resolve(n ? n.document.mutableCopy() : MutableDocument.newInvalidDocument(t));
        }
        getEntries(e, t) {
            let n = __PRIVATE_mutableDocumentMap();
            return t.forEach((e => {
                const t = this.docs.get(e);
                n = n.insert(e, t ? t.document.mutableCopy() : MutableDocument.newInvalidDocument(e));
            })), PersistencePromise.resolve(n);
        }
        getDocumentsMatchingQuery(e, t, n, r) {
            let i = __PRIVATE_mutableDocumentMap();
            // Documents are ordered by key, so we can use a prefix scan to narrow down
            // the documents we need to match the query against.
                    const s = t.path, o = new DocumentKey(s.child("")), _ = this.docs.getIteratorFrom(o);
            for (;_.hasNext(); ) {
                const {key: e, value: {document: o}} = _.getNext();
                if (!s.isPrefixOf(e.path)) break;
                e.path.length > s.length + 1 || (__PRIVATE_indexOffsetComparator(__PRIVATE_newIndexOffsetFromDocument(o), n) <= 0 || (r.has(o.key) || __PRIVATE_queryMatches(t, o)) && (i = i.insert(o.key, o.mutableCopy())));
            }
            return PersistencePromise.resolve(i);
        }
        getAllFromCollectionGroup(e, t, n, r) {
            // This method should only be called from the IndexBackfiller if persistence
            // is enabled.
            fail();
        }
        Fr(e, t) {
            return PersistencePromise.forEach(this.docs, (e => t(e)));
        }
        newChangeBuffer(e) {
            // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
            // a separate changelog and does not need special handling for removals.
            return new __PRIVATE_MemoryRemoteDocumentChangeBuffer(this);
        }
        getSize(e) {
            return PersistencePromise.resolve(this.size);
        }
    }

    /**
     * Creates a new memory-only RemoteDocumentCache.
     *
     * @param sizer - Used to assess the size of a document. For eager GC, this is
     * expected to just return 0 to avoid unnecessarily doing the work of
     * calculating the size.
     */
    /**
     * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
     */
    class __PRIVATE_MemoryRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
        constructor(e) {
            super(), this.ar = e;
        }
        applyChanges(e) {
            const t = [];
            return this.changes.forEach(((n, r) => {
                r.isValidDocument() ? t.push(this.ar.addEntry(e, r)) : this.ar.removeEntry(n);
            })), PersistencePromise.waitFor(t);
        }
        getFromCache(e, t) {
            return this.ar.getEntry(e, t);
        }
        getAllFromCache(e, t) {
            return this.ar.getEntries(e, t);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryTargetCache {
        constructor(e) {
            this.persistence = e, 
            /**
             * Maps a target to the data about that target
             */
            this.Mr = new ObjectMap((e => __PRIVATE_canonifyTarget(e)), __PRIVATE_targetEquals), 
            /** The last received snapshot version. */
            this.lastRemoteSnapshotVersion = SnapshotVersion.min(), 
            /** The highest numbered target ID encountered. */
            this.highestTargetId = 0, 
            /** The highest sequence number encountered. */
            this.Or = 0, 
            /**
             * A ordered bidirectional mapping between documents and the remote target
             * IDs.
             */
            this.Nr = new __PRIVATE_ReferenceSet, this.targetCount = 0, this.Br = __PRIVATE_TargetIdGenerator.Nn();
        }
        forEachTarget(e, t) {
            return this.Mr.forEach(((e, n) => t(n))), PersistencePromise.resolve();
        }
        getLastRemoteSnapshotVersion(e) {
            return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
        }
        getHighestSequenceNumber(e) {
            return PersistencePromise.resolve(this.Or);
        }
        allocateTargetId(e) {
            return this.highestTargetId = this.Br.next(), PersistencePromise.resolve(this.highestTargetId);
        }
        setTargetsMetadata(e, t, n) {
            return n && (this.lastRemoteSnapshotVersion = n), t > this.Or && (this.Or = t), 
            PersistencePromise.resolve();
        }
        qn(e) {
            this.Mr.set(e.target, e);
            const t = e.targetId;
            t > this.highestTargetId && (this.Br = new __PRIVATE_TargetIdGenerator(t), this.highestTargetId = t), 
            e.sequenceNumber > this.Or && (this.Or = e.sequenceNumber);
        }
        addTargetData(e, t) {
            return this.qn(t), this.targetCount += 1, PersistencePromise.resolve();
        }
        updateTargetData(e, t) {
            return this.qn(t), PersistencePromise.resolve();
        }
        removeTargetData(e, t) {
            return this.Mr.delete(t.target), this.Nr.Vr(t.targetId), this.targetCount -= 1, 
            PersistencePromise.resolve();
        }
        removeTargets(e, t, n) {
            let r = 0;
            const i = [];
            return this.Mr.forEach(((s, o) => {
                o.sequenceNumber <= t && null === n.get(o.targetId) && (this.Mr.delete(s), i.push(this.removeMatchingKeysForTargetId(e, o.targetId)), 
                r++);
            })), PersistencePromise.waitFor(i).next((() => r));
        }
        getTargetCount(e) {
            return PersistencePromise.resolve(this.targetCount);
        }
        getTargetData(e, t) {
            const n = this.Mr.get(t) || null;
            return PersistencePromise.resolve(n);
        }
        addMatchingKeys(e, t, n) {
            return this.Nr.dr(t, n), PersistencePromise.resolve();
        }
        removeMatchingKeys(e, t, n) {
            this.Nr.Rr(t, n);
            const r = this.persistence.referenceDelegate, i = [];
            return r && t.forEach((t => {
                i.push(r.markPotentiallyOrphaned(e, t));
            })), PersistencePromise.waitFor(i);
        }
        removeMatchingKeysForTargetId(e, t) {
            return this.Nr.Vr(t), PersistencePromise.resolve();
        }
        getMatchingKeysForTargetId(e, t) {
            const n = this.Nr.gr(t);
            return PersistencePromise.resolve(n);
        }
        containsKey(e, t) {
            return PersistencePromise.resolve(this.Nr.containsKey(t));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A memory-backed instance of Persistence. Data is stored only in RAM and
     * not persisted across sessions.
     */
    class __PRIVATE_MemoryPersistence {
        /**
         * The constructor accepts a factory for creating a reference delegate. This
         * allows both the delegate and this instance to have strong references to
         * each other without having nullable fields that would then need to be
         * checked or asserted on every access.
         */
        constructor(e, t) {
            this.Lr = {}, this.overlays = {}, this.kr = new __PRIVATE_ListenSequence(0), this.qr = !1, 
            this.qr = !0, this.referenceDelegate = e(this), this.Qr = new __PRIVATE_MemoryTargetCache(this);
            this.indexManager = new __PRIVATE_MemoryIndexManager, this.remoteDocumentCache = function __PRIVATE_newMemoryRemoteDocumentCache(e) {
                return new __PRIVATE_MemoryRemoteDocumentCacheImpl(e);
            }((e => this.referenceDelegate.Kr(e))), this.serializer = new __PRIVATE_LocalSerializer(t), 
            this.$r = new __PRIVATE_MemoryBundleCache(this.serializer);
        }
        start() {
            return Promise.resolve();
        }
        shutdown() {
            // No durable state to ensure is closed on shutdown.
            return this.qr = !1, Promise.resolve();
        }
        get started() {
            return this.qr;
        }
        setDatabaseDeletedListener() {
            // No op.
        }
        setNetworkEnabled() {
            // No op.
        }
        getIndexManager(e) {
            // We do not currently support indices for memory persistence, so we can
            // return the same shared instance of the memory index manager.
            return this.indexManager;
        }
        getDocumentOverlayCache(e) {
            let t = this.overlays[e.toKey()];
            return t || (t = new __PRIVATE_MemoryDocumentOverlayCache, this.overlays[e.toKey()] = t), 
            t;
        }
        getMutationQueue(e, t) {
            let n = this.Lr[e.toKey()];
            return n || (n = new __PRIVATE_MemoryMutationQueue(t, this.referenceDelegate), this.Lr[e.toKey()] = n), 
            n;
        }
        getTargetCache() {
            return this.Qr;
        }
        getRemoteDocumentCache() {
            return this.remoteDocumentCache;
        }
        getBundleCache() {
            return this.$r;
        }
        runTransaction(e, t, n) {
            __PRIVATE_logDebug("MemoryPersistence", "Starting transaction:", e);
            const r = new __PRIVATE_MemoryTransaction(this.kr.next());
            return this.referenceDelegate.Ur(), n(r).next((e => this.referenceDelegate.Wr(r).next((() => e)))).toPromise().then((e => (r.raiseOnCommittedEvent(), 
            e)));
        }
        Gr(e, t) {
            return PersistencePromise.or(Object.values(this.Lr).map((n => () => n.containsKey(e, t))));
        }
    }

    /**
     * Memory persistence is not actually transactional, but future implementations
     * may have transaction-scoped state.
     */ class __PRIVATE_MemoryTransaction extends PersistenceTransaction {
        constructor(e) {
            super(), this.currentSequenceNumber = e;
        }
    }

    class __PRIVATE_MemoryEagerDelegate {
        constructor(e) {
            this.persistence = e, 
            /** Tracks all documents that are active in Query views. */
            this.zr = new __PRIVATE_ReferenceSet, 
            /** The list of documents that are potentially GCed after each transaction. */
            this.jr = null;
        }
        static Hr(e) {
            return new __PRIVATE_MemoryEagerDelegate(e);
        }
        get Jr() {
            if (this.jr) return this.jr;
            throw fail();
        }
        addReference(e, t, n) {
            return this.zr.addReference(n, t), this.Jr.delete(n.toString()), PersistencePromise.resolve();
        }
        removeReference(e, t, n) {
            return this.zr.removeReference(n, t), this.Jr.add(n.toString()), PersistencePromise.resolve();
        }
        markPotentiallyOrphaned(e, t) {
            return this.Jr.add(t.toString()), PersistencePromise.resolve();
        }
        removeTarget(e, t) {
            this.zr.Vr(t.targetId).forEach((e => this.Jr.add(e.toString())));
            const n = this.persistence.getTargetCache();
            return n.getMatchingKeysForTargetId(e, t.targetId).next((e => {
                e.forEach((e => this.Jr.add(e.toString())));
            })).next((() => n.removeTargetData(e, t)));
        }
        Ur() {
            this.jr = new Set;
        }
        Wr(e) {
            // Remove newly orphaned documents.
            const t = this.persistence.getRemoteDocumentCache().newChangeBuffer();
            return PersistencePromise.forEach(this.Jr, (n => {
                const r = DocumentKey.fromPath(n);
                return this.Yr(e, r).next((e => {
                    e || t.removeEntry(r, SnapshotVersion.min());
                }));
            })).next((() => (this.jr = null, t.apply(e))));
        }
        updateLimboDocument(e, t) {
            return this.Yr(e, t).next((e => {
                e ? this.Jr.delete(t.toString()) : this.Jr.add(t.toString());
            }));
        }
        Kr(e) {
            // For eager GC, we don't care about the document size, there are no size thresholds.
            return 0;
        }
        Yr(e, t) {
            return PersistencePromise.or([ () => PersistencePromise.resolve(this.zr.containsKey(t)), () => this.persistence.getTargetCache().containsKey(e, t), () => this.persistence.Gr(e, t) ]);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A set of changes to what documents are currently in view and out of view for
     * a given query. These changes are sent to the LocalStore by the View (via
     * the SyncEngine) and are used to pin / unpin documents as appropriate.
     */
    class __PRIVATE_LocalViewChanges {
        constructor(e, t, n, r) {
            this.targetId = e, this.fromCache = t, this.qi = n, this.Qi = r;
        }
        static Ki(e, t) {
            let n = __PRIVATE_documentKeySet(), r = __PRIVATE_documentKeySet();
            for (const e of t.docChanges) switch (e.type) {
              case 0 /* ChangeType.Added */ :
                n = n.add(e.doc.key);
                break;

              case 1 /* ChangeType.Removed */ :
                r = r.add(e.doc.key);
     // do nothing
                    }
            return new __PRIVATE_LocalViewChanges(e, t.fromCache, n, r);
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A tracker to keep a record of important details during database local query
     * execution.
     */ class QueryContext {
        constructor() {
            /**
             * Counts the number of documents passed through during local query execution.
             */
            this._documentReadCount = 0;
        }
        get documentReadCount() {
            return this._documentReadCount;
        }
        incrementDocumentReadCount(e) {
            this._documentReadCount += e;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The Firestore query engine.
     *
     * Firestore queries can be executed in three modes. The Query Engine determines
     * what mode to use based on what data is persisted. The mode only determines
     * the runtime complexity of the query - the result set is equivalent across all
     * implementations.
     *
     * The Query engine will use indexed-based execution if a user has configured
     * any index that can be used to execute query (via `setIndexConfiguration()`).
     * Otherwise, the engine will try to optimize the query by re-using a previously
     * persisted query result. If that is not possible, the query will be executed
     * via a full collection scan.
     *
     * Index-based execution is the default when available. The query engine
     * supports partial indexed execution and merges the result from the index
     * lookup with documents that have not yet been indexed. The index evaluation
     * matches the backend's format and as such, the SDK can use indexing for all
     * queries that the backend supports.
     *
     * If no index exists, the query engine tries to take advantage of the target
     * document mapping in the TargetCache. These mappings exists for all queries
     * that have been synced with the backend at least once and allow the query
     * engine to only read documents that previously matched a query plus any
     * documents that were edited after the query was last listened to.
     *
     * There are some cases when this optimization is not guaranteed to produce
     * the same results as full collection scans. In these cases, query
     * processing falls back to full scans. These cases are:
     *
     * - Limit queries where a document that matched the query previously no longer
     *   matches the query.
     *
     * - Limit queries where a document edit may cause the document to sort below
     *   another document that is in the local cache.
     *
     * - Queries that have never been CURRENT or free of limbo documents.
     */
    class __PRIVATE_QueryEngine {
        constructor() {
            this.$i = !1, this.Ui = !1, 
            /**
             * SDK only decides whether it should create index when collection size is
             * larger than this.
             */
            this.Wi = 100, this.Gi = 8;
        }
        /** Sets the document view to query against. */    initialize(e, t) {
            this.zi = e, this.indexManager = t, this.$i = !0;
        }
        /** Returns all local documents matching the specified query. */    getDocumentsMatchingQuery(e, t, n, r) {
            // Stores the result from executing the query; using this object is more
            // convenient than passing the result between steps of the persistence
            // transaction and improves readability comparatively.
            const i = {
                result: null
            };
            return this.ji(e, t).next((e => {
                i.result = e;
            })).next((() => {
                if (!i.result) return this.Hi(e, t, r, n).next((e => {
                    i.result = e;
                }));
            })).next((() => {
                if (i.result) return;
                const n = new QueryContext;
                return this.Ji(e, t, n).next((r => {
                    if (i.result = r, this.Ui) return this.Yi(e, t, n, r.size);
                }));
            })).next((() => i.result));
        }
        Yi(e, t, n, r) {
            return n.documentReadCount < this.Wi ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "SDK will not create cache indexes for query:", __PRIVATE_stringifyQuery(t), "since it only creates cache indexes for collection contains", "more than or equal to", this.Wi, "documents"), 
            PersistencePromise.resolve()) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Query:", __PRIVATE_stringifyQuery(t), "scans", n.documentReadCount, "local documents and returns", r, "documents as results."), 
            n.documentReadCount > this.Gi * r ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "The SDK decides to create cache indexes for query:", __PRIVATE_stringifyQuery(t), "as using cache indexes may help improve performance."), 
            this.indexManager.createTargetIndexes(e, __PRIVATE_queryToTarget(t))) : PersistencePromise.resolve());
        }
        /**
         * Performs an indexed query that evaluates the query based on a collection's
         * persisted index values. Returns `null` if an index is not available.
         */    ji(e, t) {
            if (__PRIVATE_queryMatchesAllDocuments(t)) 
            // Queries that match all documents don't benefit from using
            // key-based lookups. It is more efficient to scan all documents in a
            // collection, rather than to perform individual lookups.
            return PersistencePromise.resolve(null);
            let n = __PRIVATE_queryToTarget(t);
            return this.indexManager.getIndexType(e, n).next((r => 0 /* IndexType.NONE */ === r ? null : (null !== t.limit && 1 /* IndexType.PARTIAL */ === r && (
            // We cannot apply a limit for targets that are served using a partial
            // index. If a partial index will be used to serve the target, the
            // query may return a superset of documents that match the target
            // (e.g. if the index doesn't include all the target's filters), or
            // may return the correct set of documents in the wrong order (e.g. if
            // the index doesn't include a segment for one of the orderBys).
            // Therefore, a limit should not be applied in such cases.
            t = __PRIVATE_queryWithLimit(t, null, "F" /* LimitType.First */), n = __PRIVATE_queryToTarget(t)), 
            this.indexManager.getDocumentsMatchingTarget(e, n).next((r => {
                const i = __PRIVATE_documentKeySet(...r);
                return this.zi.getDocuments(e, i).next((r => this.indexManager.getMinOffset(e, n).next((n => {
                    const s = this.Zi(t, r);
                    return this.Xi(t, s, i, n.readTime) ? this.ji(e, __PRIVATE_queryWithLimit(t, null, "F" /* LimitType.First */)) : this.es(e, s, t, n);
                }))));
            })))));
        }
        /**
         * Performs a query based on the target's persisted query mapping. Returns
         * `null` if the mapping is not available or cannot be used.
         */    Hi(e, t, n, r) {
            return __PRIVATE_queryMatchesAllDocuments(t) || r.isEqual(SnapshotVersion.min()) ? PersistencePromise.resolve(null) : this.zi.getDocuments(e, n).next((i => {
                const s = this.Zi(t, i);
                return this.Xi(t, s, n, r) ? PersistencePromise.resolve(null) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), __PRIVATE_stringifyQuery(t)), 
                this.es(e, s, t, __PRIVATE_newIndexOffsetSuccessorFromReadTime(r, -1)).next((e => e)));
            }));
            // Queries that have never seen a snapshot without limbo free documents
            // should also be run as a full collection scan.
            }
        /** Applies the query filter and sorting to the provided documents.  */    Zi(e, t) {
            // Sort the documents and re-apply the query filter since previously
            // matching documents do not necessarily still match the query.
            let n = new SortedSet(__PRIVATE_newQueryComparator(e));
            return t.forEach(((t, r) => {
                __PRIVATE_queryMatches(e, r) && (n = n.add(r));
            })), n;
        }
        /**
         * Determines if a limit query needs to be refilled from cache, making it
         * ineligible for index-free execution.
         *
         * @param query - The query.
         * @param sortedPreviousResults - The documents that matched the query when it
         * was last synchronized, sorted by the query's comparator.
         * @param remoteKeys - The document keys that matched the query at the last
         * snapshot.
         * @param limboFreeSnapshotVersion - The version of the snapshot when the
         * query was last synchronized.
         */    Xi(e, t, n, r) {
            if (null === e.limit) 
            // Queries without limits do not need to be refilled.
            return !1;
            if (n.size !== t.size) 
            // The query needs to be refilled if a previously matching document no
            // longer matches.
            return !0;
            // Limit queries are not eligible for index-free query execution if there is
            // a potential that an older document from cache now sorts before a document
            // that was previously part of the limit. This, however, can only happen if
            // the document at the edge of the limit goes out of limit.
            // If a document that is not the limit boundary sorts differently,
            // the boundary of the limit itself did not change and documents from cache
            // will continue to be "rejected" by this boundary. Therefore, we can ignore
            // any modifications that don't affect the last document.
                    const i = "F" /* LimitType.First */ === e.limitType ? t.last() : t.first();
            return !!i && (i.hasPendingWrites || i.version.compareTo(r) > 0);
        }
        Ji(e, t, n) {
            return __PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Using full collection scan to execute query:", __PRIVATE_stringifyQuery(t)), 
            this.zi.getDocumentsMatchingQuery(e, t, IndexOffset.min(), n);
        }
        /**
         * Combines the results from an indexed execution with the remaining documents
         * that have not yet been indexed.
         */    es(e, t, n, r) {
            // Retrieve all results for documents that were updated since the offset.
            return this.zi.getDocumentsMatchingQuery(e, n, r).next((e => (
            // Merge with existing results
            t.forEach((t => {
                e = e.insert(t.key, t);
            })), e)));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Implements `LocalStore` interface.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */
    class __PRIVATE_LocalStoreImpl {
        constructor(
        /** Manages our in-memory or durable persistence. */
        e, t, n, r) {
            this.persistence = e, this.ts = t, this.serializer = r, 
            /**
             * Maps a targetID to data about its target.
             *
             * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
             * of `applyRemoteEvent()` idempotent.
             */
            this.ns = new SortedMap(__PRIVATE_primitiveComparator), 
            /** Maps a target to its targetID. */
            // TODO(wuandy): Evaluate if TargetId can be part of Target.
            this.rs = new ObjectMap((e => __PRIVATE_canonifyTarget(e)), __PRIVATE_targetEquals), 
            /**
             * A per collection group index of the last read time processed by
             * `getNewDocumentChanges()`.
             *
             * PORTING NOTE: This is only used for multi-tab synchronization.
             */
            this.ss = new Map, this.os = e.getRemoteDocumentCache(), this.Qr = e.getTargetCache(), 
            this.$r = e.getBundleCache(), this._s(n);
        }
        _s(e) {
            // TODO(indexing): Add spec tests that test these components change after a
            // user change
            this.documentOverlayCache = this.persistence.getDocumentOverlayCache(e), this.indexManager = this.persistence.getIndexManager(e), 
            this.mutationQueue = this.persistence.getMutationQueue(e, this.indexManager), this.localDocuments = new LocalDocumentsView(this.os, this.mutationQueue, this.documentOverlayCache, this.indexManager), 
            this.os.setIndexManager(this.indexManager), this.ts.initialize(this.localDocuments, this.indexManager);
        }
        collectGarbage(e) {
            return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (t => e.collect(t, this.ns)));
        }
    }

    function __PRIVATE_newLocalStore(
    /** Manages our in-memory or durable persistence. */
    e, t, n, r) {
        return new __PRIVATE_LocalStoreImpl(e, t, n, r);
    }

    /**
     * Tells the LocalStore that the currently authenticated user has changed.
     *
     * In response the local store switches the mutation queue to the new user and
     * returns any resulting document changes.
     */
    // PORTING NOTE: Android and iOS only return the documents affected by the
    // change.
    async function __PRIVATE_localStoreHandleUserChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        return await n.persistence.runTransaction("Handle user change", "readonly", (e => {
            // Swap out the mutation queue, grabbing the pending mutation batches
            // before and after.
            let r;
            return n.mutationQueue.getAllMutationBatches(e).next((i => (r = i, n._s(t), n.mutationQueue.getAllMutationBatches(e)))).next((t => {
                const i = [], s = [];
                // Union the old/new changed keys.
                let o = __PRIVATE_documentKeySet();
                for (const e of r) {
                    i.push(e.batchId);
                    for (const t of e.mutations) o = o.add(t.key);
                }
                for (const e of t) {
                    s.push(e.batchId);
                    for (const t of e.mutations) o = o.add(t.key);
                }
                // Return the set of all (potentially) changed documents and the list
                // of mutation batch IDs that were affected by change.
                            return n.localDocuments.getDocuments(e, o).next((e => ({
                    us: e,
                    removedBatchIds: i,
                    addedBatchIds: s
                })));
            }));
        }));
    }

    /* Accepts locally generated Mutations and commit them to storage. */
    /**
     * Acknowledges the given batch.
     *
     * On the happy path when a batch is acknowledged, the local store will
     *
     *  + remove the batch from the mutation queue;
     *  + apply the changes to the remote document cache;
     *  + recalculate the latency compensated view implied by those changes (there
     *    may be mutations in the queue that affect the documents but haven't been
     *    acknowledged yet); and
     *  + give the changed documents back the sync engine
     *
     * @returns The resulting (modified) documents.
     */
    function __PRIVATE_localStoreAcknowledgeBatch(e, t) {
        const n = __PRIVATE_debugCast(e);
        return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", (e => {
            const r = t.batch.keys(), i = n.os.newChangeBuffer({
                trackRemovals: !0
            });
            return function __PRIVATE_applyWriteToRemoteDocuments(e, t, n, r) {
                const i = n.batch, s = i.keys();
                let o = PersistencePromise.resolve();
                return s.forEach((e => {
                    o = o.next((() => r.getEntry(t, e))).next((t => {
                        const s = n.docVersions.get(e);
                        __PRIVATE_hardAssert(null !== s), t.version.compareTo(s) < 0 && (i.applyToRemoteDocument(t, n), 
                        t.isValidDocument() && (
                        // We use the commitVersion as the readTime rather than the
                        // document's updateTime since the updateTime is not advanced
                        // for updates that do not modify the underlying document.
                        t.setReadTime(n.commitVersion), r.addEntry(t)));
                    }));
                })), o.next((() => e.mutationQueue.removeMutationBatch(t, i)));
            }
            /** Returns the local view of the documents affected by a mutation batch. */
            // PORTING NOTE: Multi-Tab only.
            (n, e, t, i).next((() => i.apply(e))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t.batch.batchId))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, function __PRIVATE_getKeysWithTransformResults(e) {
                let t = __PRIVATE_documentKeySet();
                for (let n = 0; n < e.mutationResults.length; ++n) {
                    e.mutationResults[n].transformResults.length > 0 && (t = t.add(e.batch.mutations[n].key));
                }
                return t;
            }
            /**
     * Removes mutations from the MutationQueue for the specified batch;
     * LocalDocuments will be recalculated.
     *
     * @returns The resulting modified documents.
     */ (t)))).next((() => n.localDocuments.getDocuments(e, r)));
        }));
    }

    /**
     * Returns the last consistent snapshot processed (used by the RemoteStore to
     * determine whether to buffer incoming snapshots from the backend).
     */
    function __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e) {
        const t = __PRIVATE_debugCast(e);
        return t.persistence.runTransaction("Get last remote snapshot version", "readonly", (e => t.Qr.getLastRemoteSnapshotVersion(e)));
    }

    /**
     * Gets the mutation batch after the passed in batchId in the mutation queue
     * or null if empty.
     * @param afterBatchId - If provided, the batch to search after.
     * @returns The next mutation or null if there wasn't one.
     */
    function __PRIVATE_localStoreGetNextMutationBatch(e, t) {
        const n = __PRIVATE_debugCast(e);
        return n.persistence.runTransaction("Get next mutation batch", "readonly", (e => (void 0 === t && (t = -1), 
        n.mutationQueue.getNextMutationBatchAfterBatchId(e, t))));
    }

    /**
     * Metadata state of the local client. Unlike `RemoteClientState`, this class is
     * mutable and keeps track of all pending mutations, which allows us to
     * update the range of pending mutation batch IDs as new mutations are added or
     * removed.
     *
     * The data in `LocalClientState` is not read from WebStorage and instead
     * updated via its instance methods. The updated state can be serialized via
     * `toWebStorageJSON()`.
     */
    // Visible for testing.
    class __PRIVATE_LocalClientState {
        constructor() {
            this.activeTargetIds = __PRIVATE_targetIdSet();
        }
        As(e) {
            this.activeTargetIds = this.activeTargetIds.add(e);
        }
        Rs(e) {
            this.activeTargetIds = this.activeTargetIds.delete(e);
        }
        /**
         * Converts this entry into a JSON-encoded format we can use for WebStorage.
         * Does not encode `clientId` as it is part of the key in WebStorage.
         */    ds() {
            const e = {
                activeTargetIds: this.activeTargetIds.toArray(),
                updateTimeMs: Date.now()
            };
            return JSON.stringify(e);
        }
    }

    class __PRIVATE_MemorySharedClientState {
        constructor() {
            this.no = new __PRIVATE_LocalClientState, this.ro = {}, this.onlineStateHandler = null, 
            this.sequenceNumberHandler = null;
        }
        addPendingMutation(e) {
            // No op.
        }
        updateMutationState(e, t, n) {
            // No op.
        }
        addLocalQueryTarget(e) {
            return this.no.As(e), this.ro[e] || "not-current";
        }
        updateQueryState(e, t, n) {
            this.ro[e] = t;
        }
        removeLocalQueryTarget(e) {
            this.no.Rs(e);
        }
        isLocalQueryTarget(e) {
            return this.no.activeTargetIds.has(e);
        }
        clearQueryState(e) {
            delete this.ro[e];
        }
        getAllActiveQueryTargets() {
            return this.no.activeTargetIds;
        }
        isActiveQueryTarget(e) {
            return this.no.activeTargetIds.has(e);
        }
        start() {
            return this.no = new __PRIVATE_LocalClientState, Promise.resolve();
        }
        handleUserChange(e, t, n) {
            // No op.
        }
        setOnlineState(e) {
            // No op.
        }
        shutdown() {}
        writeSequenceNumber(e) {}
        notifyBundleLoaded(e) {
            // No op.
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_NoopConnectivityMonitor {
        io(e) {
            // No-op.
        }
        shutdown() {
            // No-op.
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // References to `window` are guarded by BrowserConnectivityMonitor.isAvailable()
    /* eslint-disable no-restricted-globals */
    /**
     * Browser implementation of ConnectivityMonitor.
     */
    class __PRIVATE_BrowserConnectivityMonitor {
        constructor() {
            this.so = () => this.oo(), this._o = () => this.ao(), this.uo = [], this.co();
        }
        io(e) {
            this.uo.push(e);
        }
        shutdown() {
            window.removeEventListener("online", this.so), window.removeEventListener("offline", this._o);
        }
        co() {
            window.addEventListener("online", this.so), window.addEventListener("offline", this._o);
        }
        oo() {
            __PRIVATE_logDebug("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
            for (const e of this.uo) e(0 /* NetworkStatus.AVAILABLE */);
        }
        ao() {
            __PRIVATE_logDebug("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
            for (const e of this.uo) e(1 /* NetworkStatus.UNAVAILABLE */);
        }
        // TODO(chenbrian): Consider passing in window either into this component or
        // here for testing via FakeWindow.
        /** Checks that all used attributes of window are available. */
        static C() {
            return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The value returned from the most recent invocation of
     * `generateUniqueDebugId()`, or null if it has never been invoked.
     */ let Ae = null;

    /**
     * Generates and returns an initial value for `lastUniqueDebugId`.
     *
     * The returned value is randomly selected from a range of integers that are
     * represented as 8 hexadecimal digits. This means that (within reason) any
     * numbers generated by incrementing the returned number by 1 will also be
     * represented by 8 hexadecimal digits. This leads to all "IDs" having the same
     * length when converted to a hexadecimal string, making reading logs containing
     * these IDs easier to follow. And since the return value is randomly selected
     * it will help to differentiate between logs from different executions.
     */
    /**
     * Generates and returns a unique ID as a hexadecimal string.
     *
     * The returned ID is intended to be used in debug logging messages to help
     * correlate log messages that may be spatially separated in the logs, but
     * logically related. For example, a network connection could include the same
     * "debug ID" string in all of its log messages to help trace a specific
     * connection over time.
     *
     * @return the 10-character generated ID (e.g. "0xa1b2c3d4").
     */
    function __PRIVATE_generateUniqueDebugId() {
        return null === Ae ? Ae = function __PRIVATE_generateInitialUniqueDebugId() {
            return 268435456 + Math.round(2147483648 * Math.random());
        }() : Ae++, "0x" + Ae.toString(16);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Re = {
        BatchGetDocuments: "batchGet",
        Commit: "commit",
        RunQuery: "runQuery",
        RunAggregationQuery: "runAggregationQuery"
    };

    /**
     * Maps RPC names to the corresponding REST endpoint name.
     *
     * We use array notation to avoid mangling.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a simple helper class that implements the Stream interface to
     * bridge to other implementations that are streams but do not implement the
     * interface. The stream callbacks are invoked with the callOn... methods.
     */
    class __PRIVATE_StreamBridge {
        constructor(e) {
            this.lo = e.lo, this.ho = e.ho;
        }
        Po(e) {
            this.Io = e;
        }
        To(e) {
            this.Eo = e;
        }
        onMessage(e) {
            this.Ao = e;
        }
        close() {
            this.ho();
        }
        send(e) {
            this.lo(e);
        }
        Ro() {
            this.Io();
        }
        Vo(e) {
            this.Eo(e);
        }
        mo(e) {
            this.Ao(e);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Ve = "WebChannelConnection";

    class __PRIVATE_WebChannelConnection extends 
    /**
     * Base class for all Rest-based connections to the backend (WebChannel and
     * HTTP).
     */
    class __PRIVATE_RestConnection {
        constructor(e) {
            this.databaseInfo = e, this.databaseId = e.databaseId;
            const t = e.ssl ? "https" : "http", n = encodeURIComponent(this.databaseId.projectId), r = encodeURIComponent(this.databaseId.database);
            this.fo = t + "://" + e.host, this.po = `projects/${n}/databases/${r}`, this.yo = "(default)" === this.databaseId.database ? `project_id=${n}` : `project_id=${n}&database_id=${r}`;
        }
        get wo() {
            // Both `invokeRPC()` and `invokeStreamingRPC()` use their `path` arguments to determine
            // where to run the query, and expect the `request` to NOT specify the "path".
            return !1;
        }
        So(e, t, n, r, i) {
            const s = __PRIVATE_generateUniqueDebugId(), o = this.bo(e, t);
            __PRIVATE_logDebug("RestConnection", `Sending RPC '${e}' ${s}:`, o, n);
            const _ = {
                "google-cloud-resource-prefix": this.po,
                "x-goog-request-params": this.yo
            };
            return this.Do(_, r, i), this.Co(e, o, _, n).then((t => (__PRIVATE_logDebug("RestConnection", `Received RPC '${e}' ${s}: `, t), 
            t)), (t => {
                throw __PRIVATE_logWarn("RestConnection", `RPC '${e}' ${s} failed with error: `, t, "url: ", o, "request:", n), 
                t;
            }));
        }
        vo(e, t, n, r, i, s) {
            // The REST API automatically aggregates all of the streamed results, so we
            // can just use the normal invoke() method.
            return this.So(e, t, n, r, i);
        }
        /**
         * Modifies the headers for a request, adding any authorization token if
         * present and any additional headers for the request.
         */    Do(e, t, n) {
            e["X-Goog-Api-Client"] = 
            // SDK_VERSION is updated to different value at runtime depending on the entry point,
            // so we need to get its value when we need it in a function.
            function __PRIVATE_getGoogApiClientValue() {
                return "gl-js/ fire/" + S;
            }(), 
            // Content-Type: text/plain will avoid preflight requests which might
            // mess with CORS and redirects by proxies. If we add custom headers
            // we will need to change this code to potentially use the $httpOverwrite
            // parameter supported by ESF to avoid triggering preflight requests.
            e["Content-Type"] = "text/plain", this.databaseInfo.appId && (e["X-Firebase-GMPID"] = this.databaseInfo.appId), 
            t && t.headers.forEach(((t, n) => e[n] = t)), n && n.headers.forEach(((t, n) => e[n] = t));
        }
        bo(e, t) {
            const n = Re[e];
            return `${this.fo}/v1/${t}:${n}`;
        }
    } {
        constructor(e) {
            super(e), this.forceLongPolling = e.forceLongPolling, this.autoDetectLongPolling = e.autoDetectLongPolling, 
            this.useFetchStreams = e.useFetchStreams, this.longPollingOptions = e.longPollingOptions;
        }
        Co(e, t, n, r) {
            const i = __PRIVATE_generateUniqueDebugId();
            return new Promise(((s, o) => {
                const _ = new XhrIo;
                _.setWithCredentials(!0), _.listenOnce(EventType.COMPLETE, (() => {
                    try {
                        switch (_.getLastErrorCode()) {
                          case ErrorCode.NO_ERROR:
                            const t = _.getResponseJson();
                            __PRIVATE_logDebug(Ve, `XHR for RPC '${e}' ${i} received:`, JSON.stringify(t)), 
                            s(t);
                            break;

                          case ErrorCode.TIMEOUT:
                            __PRIVATE_logDebug(Ve, `RPC '${e}' ${i} timed out`), o(new FirestoreError(D.DEADLINE_EXCEEDED, "Request time out"));
                            break;

                          case ErrorCode.HTTP_ERROR:
                            const n = _.getStatus();
                            if (__PRIVATE_logDebug(Ve, `RPC '${e}' ${i} failed with status:`, n, "response text:", _.getResponseText()), 
                            n > 0) {
                                let e = _.getResponseJson();
                                Array.isArray(e) && (e = e[0]);
                                const t = null == e ? void 0 : e.error;
                                if (t && t.status && t.message) {
                                    const e = function __PRIVATE_mapCodeFromHttpResponseErrorStatus(e) {
                                        const t = e.toLowerCase().replace(/_/g, "-");
                                        return Object.values(D).indexOf(t) >= 0 ? t : D.UNKNOWN;
                                    }(t.status);
                                    o(new FirestoreError(e, t.message));
                                } else o(new FirestoreError(D.UNKNOWN, "Server responded with status " + _.getStatus()));
                            } else 
                            // If we received an HTTP_ERROR but there's no status code,
                            // it's most probably a connection issue
                            o(new FirestoreError(D.UNAVAILABLE, "Connection failed."));
                            break;

                          default:
                            fail();
                        }
                    } finally {
                        __PRIVATE_logDebug(Ve, `RPC '${e}' ${i} completed.`);
                    }
                }));
                const a = JSON.stringify(r);
                __PRIVATE_logDebug(Ve, `RPC '${e}' ${i} sending request:`, r), _.send(t, "POST", a, n, 15);
            }));
        }
        Fo(e, t, n) {
            const r = __PRIVATE_generateUniqueDebugId(), i = [ this.fo, "/", "google.firestore.v1.Firestore", "/", e, "/channel" ], s = createWebChannelTransport(), o = getStatEventTarget(), _ = {
                // Required for backend stickiness, routing behavior is based on this
                // parameter.
                httpSessionIdParam: "gsessionid",
                initMessageHeaders: {},
                messageUrlParams: {
                    // This param is used to improve routing and project isolation by the
                    // backend and must be included in every request.
                    database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`
                },
                sendRawJson: !0,
                supportsCrossDomainXhr: !0,
                internalChannelParams: {
                    // Override the default timeout (randomized between 10-20 seconds) since
                    // a large write batch on a slow internet connection may take a long
                    // time to send to the backend. Rather than have WebChannel impose a
                    // tight timeout which could lead to infinite timeouts and retries, we
                    // set it very large (5-10 minutes) and rely on the browser's builtin
                    // timeouts to kick in if the request isn't working.
                    forwardChannelRequestTimeoutMs: 6e5
                },
                forceLongPolling: this.forceLongPolling,
                detectBufferingProxy: this.autoDetectLongPolling
            }, a = this.longPollingOptions.timeoutSeconds;
            void 0 !== a && (_.longPollingTimeout = Math.round(1e3 * a)), this.useFetchStreams && (_.useFetchStreams = !0), 
            this.Do(_.initMessageHeaders, t, n), 
            // Sending the custom headers we just added to request.initMessageHeaders
            // (Authorization, etc.) will trigger the browser to make a CORS preflight
            // request because the XHR will no longer meet the criteria for a "simple"
            // CORS request:
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
            // Therefore to avoid the CORS preflight request (an extra network
            // roundtrip), we use the encodeInitMessageHeaders option to specify that
            // the headers should instead be encoded in the request's POST payload,
            // which is recognized by the webchannel backend.
            _.encodeInitMessageHeaders = !0;
            const u = i.join("");
            __PRIVATE_logDebug(Ve, `Creating RPC '${e}' stream ${r}: ${u}`, _);
            const c = s.createWebChannel(u, _);
            // WebChannel supports sending the first message with the handshake - saving
            // a network round trip. However, it will have to call send in the same
            // JS event loop as open. In order to enforce this, we delay actually
            // opening the WebChannel until send is called. Whether we have called
            // open is tracked with this variable.
                    let l = !1, h = !1;
            // A flag to determine whether the stream was closed (by us or through an
            // error/close event) to avoid delivering multiple close events or sending
            // on a closed stream
                    const P = new __PRIVATE_StreamBridge({
                lo: t => {
                    h ? __PRIVATE_logDebug(Ve, `Not sending because RPC '${e}' stream ${r} is closed:`, t) : (l || (__PRIVATE_logDebug(Ve, `Opening RPC '${e}' stream ${r} transport.`), 
                    c.open(), l = !0), __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} sending:`, t), 
                    c.send(t));
                },
                ho: () => c.close()
            }), __PRIVATE_unguardedEventListen = (e, t, n) => {
                // TODO(dimond): closure typing seems broken because WebChannel does
                // not implement goog.events.Listenable
                e.listen(t, (e => {
                    try {
                        n(e);
                    } catch (e) {
                        setTimeout((() => {
                            throw e;
                        }), 0);
                    }
                }));
            };
            // Closure events are guarded and exceptions are swallowed, so catch any
            // exception and rethrow using a setTimeout so they become visible again.
            // Note that eventually this function could go away if we are confident
            // enough the code is exception free.
                    return __PRIVATE_unguardedEventListen(c, WebChannel.EventType.OPEN, (() => {
                h || __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} transport opened.`);
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.CLOSE, (() => {
                h || (h = !0, __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} transport closed`), 
                P.Vo());
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.ERROR, (t => {
                h || (h = !0, __PRIVATE_logWarn(Ve, `RPC '${e}' stream ${r} transport errored:`, t), 
                P.Vo(new FirestoreError(D.UNAVAILABLE, "The operation could not be completed")));
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.MESSAGE, (t => {
                var n;
                if (!h) {
                    const i = t.data[0];
                    __PRIVATE_hardAssert(!!i);
                    // TODO(b/35143891): There is a bug in One Platform that caused errors
                    // (and only errors) to be wrapped in an extra array. To be forward
                    // compatible with the bug we need to check either condition. The latter
                    // can be removed once the fix has been rolled out.
                    // Use any because msgData.error is not typed.
                    const s = i, o = s.error || (null === (n = s[0]) || void 0 === n ? void 0 : n.error);
                    if (o) {
                        __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} received error:`, o);
                        // error.status will be a string like 'OK' or 'NOT_FOUND'.
                        const t = o.status;
                        let n = 
                        /**
     * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
     *
     * @returns The Code equivalent to the given status string or undefined if
     *     there is no match.
     */
                        function __PRIVATE_mapCodeFromRpcStatus(e) {
                            // lookup by string
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const t = ae[e];
                            if (void 0 !== t) return __PRIVATE_mapCodeFromRpcCode(t);
                        }(t), i = o.message;
                        void 0 === n && (n = D.INTERNAL, i = "Unknown error status: " + t + " with message " + o.message), 
                        // Mark closed so no further events are propagated
                        h = !0, P.Vo(new FirestoreError(n, i)), c.close();
                    } else __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} received:`, i), P.mo(i);
                }
            })), __PRIVATE_unguardedEventListen(o, Event.STAT_EVENT, (t => {
                t.stat === Stat.PROXY ? __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} detected buffering proxy`) : t.stat === Stat.NOPROXY && __PRIVATE_logDebug(Ve, `RPC '${e}' stream ${r} detected no buffering proxy`);
            })), setTimeout((() => {
                // Technically we could/should wait for the WebChannel opened event,
                // but because we want to send the first message with the WebChannel
                // handshake we pretend the channel opened here (asynchronously), and
                // then delay the actual open until the first message is sent.
                P.Ro();
            }), 0), P;
        }
    }

    /** The Platform's 'document' implementation or null if not available. */ function getDocument() {
        // `document` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof document ? document : null;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function __PRIVATE_newSerializer(e) {
        return new JsonProtoSerializer(e, /* useProto3Json= */ !0);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A helper for running delayed tasks following an exponential backoff curve
     * between attempts.
     *
     * Each delay is made up of a "base" delay which follows the exponential
     * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
     * base delay. This prevents clients from accidentally synchronizing their
     * delays causing spikes of load to the backend.
     */
    class __PRIVATE_ExponentialBackoff {
        constructor(
        /**
         * The AsyncQueue to run backoff operations on.
         */
        e, 
        /**
         * The ID to use when scheduling backoff operations on the AsyncQueue.
         */
        t, 
        /**
         * The initial delay (used as the base delay on the first retry attempt).
         * Note that jitter will still be applied, so the actual delay could be as
         * little as 0.5*initialDelayMs.
         */
        n = 1e3
        /**
         * The multiplier to use to determine the extended base delay after each
         * attempt.
         */ , r = 1.5
        /**
         * The maximum base delay after which no further backoff is performed.
         * Note that jitter will still be applied, so the actual delay could be as
         * much as 1.5*maxDelayMs.
         */ , i = 6e4) {
            this.oi = e, this.timerId = t, this.Mo = n, this.xo = r, this.Oo = i, this.No = 0, 
            this.Bo = null, 
            /** The last backoff attempt, as epoch milliseconds. */
            this.Lo = Date.now(), this.reset();
        }
        /**
         * Resets the backoff delay.
         *
         * The very next backoffAndWait() will have no delay. If it is called again
         * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
         * subsequent ones will increase according to the backoffFactor.
         */    reset() {
            this.No = 0;
        }
        /**
         * Resets the backoff delay to the maximum delay (e.g. for use after a
         * RESOURCE_EXHAUSTED error).
         */    ko() {
            this.No = this.Oo;
        }
        /**
         * Returns a promise that resolves after currentDelayMs, and increases the
         * delay for any subsequent attempts. If there was a pending backoff operation
         * already, it will be canceled.
         */    qo(e) {
            // Cancel any pending backoff operation.
            this.cancel();
            // First schedule using the current base (which may be 0 and should be
            // honored as such).
            const t = Math.floor(this.No + this.Qo()), n = Math.max(0, Date.now() - this.Lo), r = Math.max(0, t - n);
            // Guard against lastAttemptTime being in the future due to a clock change.
                    r > 0 && __PRIVATE_logDebug("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.No} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`), 
            this.Bo = this.oi.enqueueAfterDelay(this.timerId, r, (() => (this.Lo = Date.now(), 
            e()))), 
            // Apply backoff factor to determine next delay and ensure it is within
            // bounds.
            this.No *= this.xo, this.No < this.Mo && (this.No = this.Mo), this.No > this.Oo && (this.No = this.Oo);
        }
        Ko() {
            null !== this.Bo && (this.Bo.skipDelay(), this.Bo = null);
        }
        cancel() {
            null !== this.Bo && (this.Bo.cancel(), this.Bo = null);
        }
        /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    Qo() {
            return (Math.random() - .5) * this.No;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A PersistentStream is an abstract base class that represents a streaming RPC
     * to the Firestore backend. It's built on top of the connections own support
     * for streaming RPCs, and adds several critical features for our clients:
     *
     *   - Exponential backoff on failure
     *   - Authentication via CredentialsProvider
     *   - Dispatching all callbacks into the shared worker queue
     *   - Closing idle streams after 60 seconds of inactivity
     *
     * Subclasses of PersistentStream implement serialization of models to and
     * from the JSON representation of the protocol buffers for a specific
     * streaming RPC.
     *
     * ## Starting and Stopping
     *
     * Streaming RPCs are stateful and need to be start()ed before messages can
     * be sent and received. The PersistentStream will call the onOpen() function
     * of the listener once the stream is ready to accept requests.
     *
     * Should a start() fail, PersistentStream will call the registered onClose()
     * listener with a FirestoreError indicating what went wrong.
     *
     * A PersistentStream can be started and stopped repeatedly.
     *
     * Generic types:
     *  SendType: The type of the outgoing message of the underlying
     *    connection stream
     *  ReceiveType: The type of the incoming message of the underlying
     *    connection stream
     *  ListenerType: The type of the listener that will be used for callbacks
     */
    class __PRIVATE_PersistentStream {
        constructor(e, t, n, r, i, s, o, _) {
            this.oi = e, this.$o = n, this.Uo = r, this.connection = i, this.authCredentialsProvider = s, 
            this.appCheckCredentialsProvider = o, this.listener = _, this.state = 0 /* PersistentStreamState.Initial */ , 
            /**
             * A close count that's incremented every time the stream is closed; used by
             * getCloseGuardedDispatcher() to invalidate callbacks that happen after
             * close.
             */
            this.Wo = 0, this.Go = null, this.zo = null, this.stream = null, this.jo = new __PRIVATE_ExponentialBackoff(e, t);
        }
        /**
         * Returns true if start() has been called and no error has occurred. True
         * indicates the stream is open or in the process of opening (which
         * encompasses respecting backoff, getting auth tokens, and starting the
         * actual RPC). Use isOpen() to determine if the stream is open and ready for
         * outbound requests.
         */    Ho() {
            return 1 /* PersistentStreamState.Starting */ === this.state || 5 /* PersistentStreamState.Backoff */ === this.state || this.Jo();
        }
        /**
         * Returns true if the underlying RPC is open (the onOpen() listener has been
         * called) and the stream is ready for outbound requests.
         */    Jo() {
            return 2 /* PersistentStreamState.Open */ === this.state || 3 /* PersistentStreamState.Healthy */ === this.state;
        }
        /**
         * Starts the RPC. Only allowed if isStarted() returns false. The stream is
         * not immediately ready for use: onOpen() will be invoked when the RPC is
         * ready for outbound requests, at which point isOpen() will return true.
         *
         * When start returns, isStarted() will return true.
         */    start() {
            4 /* PersistentStreamState.Error */ !== this.state ? this.auth() : this.Yo();
        }
        /**
         * Stops the RPC. This call is idempotent and allowed regardless of the
         * current isStarted() state.
         *
         * When stop returns, isStarted() and isOpen() will both return false.
         */    async stop() {
            this.Ho() && await this.close(0 /* PersistentStreamState.Initial */);
        }
        /**
         * After an error the stream will usually back off on the next attempt to
         * start it. If the error warrants an immediate restart of the stream, the
         * sender can use this to indicate that the receiver should not back off.
         *
         * Each error will call the onClose() listener. That function can decide to
         * inhibit backoff if required.
         */    Zo() {
            this.state = 0 /* PersistentStreamState.Initial */ , this.jo.reset();
        }
        /**
         * Marks this stream as idle. If no further actions are performed on the
         * stream for one minute, the stream will automatically close itself and
         * notify the stream's onClose() handler with Status.OK. The stream will then
         * be in a !isStarted() state, requiring the caller to start the stream again
         * before further use.
         *
         * Only streams that are in state 'Open' can be marked idle, as all other
         * states imply pending network operations.
         */    Xo() {
            // Starts the idle time if we are in state 'Open' and are not yet already
            // running a timer (in which case the previous idle timeout still applies).
            this.Jo() && null === this.Go && (this.Go = this.oi.enqueueAfterDelay(this.$o, 6e4, (() => this.e_())));
        }
        /** Sends a message to the underlying stream. */    t_(e) {
            this.n_(), this.stream.send(e);
        }
        /** Called by the idle timer when the stream should close due to inactivity. */    async e_() {
            if (this.Jo()) 
            // When timing out an idle stream there's no reason to force the stream into backoff when
            // it restarts so set the stream state to Initial instead of Error.
            return this.close(0 /* PersistentStreamState.Initial */);
        }
        /** Marks the stream as active again. */    n_() {
            this.Go && (this.Go.cancel(), this.Go = null);
        }
        /** Cancels the health check delayed operation. */    r_() {
            this.zo && (this.zo.cancel(), this.zo = null);
        }
        /**
         * Closes the stream and cleans up as necessary:
         *
         * * closes the underlying GRPC stream;
         * * calls the onClose handler with the given 'error';
         * * sets internal stream state to 'finalState';
         * * adjusts the backoff timer based on the error
         *
         * A new stream can be opened by calling start().
         *
         * @param finalState - the intended state of the stream after closing.
         * @param error - the error the connection was closed with.
         */    async close(e, t) {
            // Cancel any outstanding timers (they're guaranteed not to execute).
            this.n_(), this.r_(), this.jo.cancel(), 
            // Invalidates any stream-related callbacks (e.g. from auth or the
            // underlying stream), guaranteeing they won't execute.
            this.Wo++, 4 /* PersistentStreamState.Error */ !== e ? 
            // If this is an intentional close ensure we don't delay our next connection attempt.
            this.jo.reset() : t && t.code === D.RESOURCE_EXHAUSTED ? (
            // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
            __PRIVATE_logError(t.toString()), __PRIVATE_logError("Using maximum backoff delay to prevent overloading the backend."), 
            this.jo.ko()) : t && t.code === D.UNAUTHENTICATED && 3 /* PersistentStreamState.Healthy */ !== this.state && (
            // "unauthenticated" error means the token was rejected. This should rarely
            // happen since both Auth and AppCheck ensure a sufficient TTL when we
            // request a token. If a user manually resets their system clock this can
            // fail, however. In this case, we should get a Code.UNAUTHENTICATED error
            // before we received the first message and we need to invalidate the token
            // to ensure that we fetch a new token.
            this.authCredentialsProvider.invalidateToken(), this.appCheckCredentialsProvider.invalidateToken()), 
            // Clean up the underlying stream because we are no longer interested in events.
            null !== this.stream && (this.i_(), this.stream.close(), this.stream = null), 
            // This state must be assigned before calling onClose() to allow the callback to
            // inhibit backoff or otherwise manipulate the state in its non-started state.
            this.state = e, 
            // Notify the listener that the stream closed.
            await this.listener.To(t);
        }
        /**
         * Can be overridden to perform additional cleanup before the stream is closed.
         * Calling super.tearDown() is not required.
         */    i_() {}
        auth() {
            this.state = 1 /* PersistentStreamState.Starting */;
            const e = this.s_(this.Wo), t = this.Wo;
            // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                    Promise.all([ this.authCredentialsProvider.getToken(), this.appCheckCredentialsProvider.getToken() ]).then((([e, n]) => {
                // Stream can be stopped while waiting for authentication.
                // TODO(mikelehen): We really should just use dispatchIfNotClosed
                // and let this dispatch onto the queue, but that opened a spec test can
                // of worms that I don't want to deal with in this PR.
                this.Wo === t && 
                // Normally we'd have to schedule the callback on the AsyncQueue.
                // However, the following calls are safe to be called outside the
                // AsyncQueue since they don't chain asynchronous calls
                this.o_(e, n);
            }), (t => {
                e((() => {
                    const e = new FirestoreError(D.UNKNOWN, "Fetching auth token failed: " + t.message);
                    return this.__(e);
                }));
            }));
        }
        o_(e, t) {
            const n = this.s_(this.Wo);
            this.stream = this.a_(e, t), this.stream.Po((() => {
                n((() => (this.state = 2 /* PersistentStreamState.Open */ , this.zo = this.oi.enqueueAfterDelay(this.Uo, 1e4, (() => (this.Jo() && (this.state = 3 /* PersistentStreamState.Healthy */), 
                Promise.resolve()))), this.listener.Po())));
            })), this.stream.To((e => {
                n((() => this.__(e)));
            })), this.stream.onMessage((e => {
                n((() => this.onMessage(e)));
            }));
        }
        Yo() {
            this.state = 5 /* PersistentStreamState.Backoff */ , this.jo.qo((async () => {
                this.state = 0 /* PersistentStreamState.Initial */ , this.start();
            }));
        }
        // Visible for tests
        __(e) {
            // In theory the stream could close cleanly, however, in our current model
            // we never expect this to happen because if we stop a stream ourselves,
            // this callback will never be called. To prevent cases where we retry
            // without a backoff accidentally, we set the stream to error in all cases.
            return __PRIVATE_logDebug("PersistentStream", `close with error: ${e}`), this.stream = null, 
            this.close(4 /* PersistentStreamState.Error */ , e);
        }
        /**
         * Returns a "dispatcher" function that dispatches operations onto the
         * AsyncQueue but only runs them if closeCount remains unchanged. This allows
         * us to turn auth / stream callbacks into no-ops if the stream is closed /
         * re-opened, etc.
         */    s_(e) {
            return t => {
                this.oi.enqueueAndForget((() => this.Wo === e ? t() : (__PRIVATE_logDebug("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
                Promise.resolve())));
            };
        }
    }

    /**
     * A Stream that implements the Write RPC.
     *
     * The Write RPC requires the caller to maintain special streamToken
     * state in between calls, to help the server understand which responses the
     * client has processed by the time the next request is made. Every response
     * will contain a streamToken; this value must be passed to the next
     * request.
     *
     * After calling start() on this stream, the next request must be a handshake,
     * containing whatever streamToken is on hand. Once a response to this
     * request is received, all pending mutations may be submitted. When
     * submitting multiple batches of mutations at the same time, it's
     * okay to use the same streamToken for the calls to writeMutations.
     *
     * TODO(b/33271235): Use proto types
     */ class __PRIVATE_PersistentWriteStream extends __PRIVATE_PersistentStream {
        constructor(e, t, n, r, i, s) {
            super(e, "write_stream_connection_backoff" /* TimerId.WriteStreamConnectionBackoff */ , "write_stream_idle" /* TimerId.WriteStreamIdle */ , "health_check_timeout" /* TimerId.HealthCheckTimeout */ , t, n, r, s), 
            this.serializer = i, this.h_ = !1;
        }
        /**
         * Tracks whether or not a handshake has been successfully exchanged and
         * the stream is ready to accept mutations.
         */    get P_() {
            return this.h_;
        }
        // Override of PersistentStream.start
        start() {
            this.h_ = !1, this.lastStreamToken = void 0, super.start();
        }
        i_() {
            this.h_ && this.I_([]);
        }
        a_(e, t) {
            return this.connection.Fo("Write", e, t);
        }
        onMessage(e) {
            if (
            // Always capture the last stream token.
            __PRIVATE_hardAssert(!!e.streamToken), this.lastStreamToken = e.streamToken, this.h_) {
                // A successful first write response means the stream is healthy,
                // Note, that we could consider a successful handshake healthy, however,
                // the write itself might be causing an error we want to back off from.
                this.jo.reset();
                const t = __PRIVATE_fromWriteResults(e.writeResults, e.commitTime), n = __PRIVATE_fromVersion(e.commitTime);
                return this.listener.T_(n, t);
            }
            // The first response is always the handshake response
            return __PRIVATE_hardAssert(!e.writeResults || 0 === e.writeResults.length), this.h_ = !0, 
            this.listener.E_();
        }
        /**
         * Sends an initial streamToken to the server, performing the handshake
         * required to make the StreamingWrite RPC work. Subsequent
         * calls should wait until onHandshakeComplete was called.
         */    d_() {
            // TODO(dimond): Support stream resumption. We intentionally do not set the
            // stream token on the handshake, ignoring any stream token we might have.
            const e = {};
            e.database = __PRIVATE_getEncodedDatabaseId(this.serializer), this.t_(e);
        }
        /** Sends a group of mutations to the Firestore backend to apply. */    I_(e) {
            const t = {
                streamToken: this.lastStreamToken,
                writes: e.map((e => toMutation(this.serializer, e)))
            };
            this.t_(t);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Datastore and its related methods are a wrapper around the external Google
     * Cloud Datastore grpc API, which provides an interface that is more convenient
     * for the rest of the client SDK architecture to consume.
     */
    /**
     * An implementation of Datastore that exposes additional state for internal
     * consumption.
     */
    class __PRIVATE_DatastoreImpl extends class Datastore {} {
        constructor(e, t, n, r) {
            super(), this.authCredentials = e, this.appCheckCredentials = t, this.connection = n, 
            this.serializer = r, this.A_ = !1;
        }
        R_() {
            if (this.A_) throw new FirestoreError(D.FAILED_PRECONDITION, "The client has already been terminated.");
        }
        /** Invokes the provided RPC with auth and AppCheck tokens. */    So(e, t, n) {
            return this.R_(), Promise.all([ this.authCredentials.getToken(), this.appCheckCredentials.getToken() ]).then((([r, i]) => this.connection.So(e, t, n, r, i))).catch((e => {
                throw "FirebaseError" === e.name ? (e.code === D.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), 
                this.appCheckCredentials.invalidateToken()), e) : new FirestoreError(D.UNKNOWN, e.toString());
            }));
        }
        /** Invokes the provided RPC with streamed results with auth and AppCheck tokens. */    vo(e, t, n, r) {
            return this.R_(), Promise.all([ this.authCredentials.getToken(), this.appCheckCredentials.getToken() ]).then((([i, s]) => this.connection.vo(e, t, n, i, s, r))).catch((e => {
                throw "FirebaseError" === e.name ? (e.code === D.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), 
                this.appCheckCredentials.invalidateToken()), e) : new FirestoreError(D.UNKNOWN, e.toString());
            }));
        }
        terminate() {
            this.A_ = !0;
        }
    }

    /**
     * A component used by the RemoteStore to track the OnlineState (that is,
     * whether or not the client as a whole should be considered to be online or
     * offline), implementing the appropriate heuristics.
     *
     * In particular, when the client is trying to connect to the backend, we
     * allow up to MAX_WATCH_STREAM_FAILURES within ONLINE_STATE_TIMEOUT_MS for
     * a connection to succeed. If we have too many failures or the timeout elapses,
     * then we set the OnlineState to Offline, and the client will behave as if
     * it is offline (get()s will return cached data, etc.).
     */
    class __PRIVATE_OnlineStateTracker {
        constructor(e, t) {
            this.asyncQueue = e, this.onlineStateHandler = t, 
            /** The current OnlineState. */
            this.state = "Unknown" /* OnlineState.Unknown */ , 
            /**
             * A count of consecutive failures to open the stream. If it reaches the
             * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
             * Offline.
             */
            this.m_ = 0, 
            /**
             * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
             * transition from OnlineState.Unknown to OnlineState.Offline without waiting
             * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
             */
            this.f_ = null, 
            /**
             * Whether the client should log a warning message if it fails to connect to
             * the backend (initially true, cleared after a successful stream, or if we've
             * logged the message already).
             */
            this.g_ = !0;
        }
        /**
         * Called by RemoteStore when a watch stream is started (including on each
         * backoff attempt).
         *
         * If this is the first attempt, it sets the OnlineState to Unknown and starts
         * the onlineStateTimer.
         */    p_() {
            0 === this.m_ && (this.y_("Unknown" /* OnlineState.Unknown */), this.f_ = this.asyncQueue.enqueueAfterDelay("online_state_timeout" /* TimerId.OnlineStateTimeout */ , 1e4, (() => (this.f_ = null, 
            this.w_("Backend didn't respond within 10 seconds."), this.y_("Offline" /* OnlineState.Offline */), 
            Promise.resolve()))));
        }
        /**
         * Updates our OnlineState as appropriate after the watch stream reports a
         * failure. The first failure moves us to the 'Unknown' state. We then may
         * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
         * actually transition to the 'Offline' state.
         */    S_(e) {
            "Online" /* OnlineState.Online */ === this.state ? this.y_("Unknown" /* OnlineState.Unknown */) : (this.m_++, 
            this.m_ >= 1 && (this.b_(), this.w_(`Connection failed 1 times. Most recent error: ${e.toString()}`), 
            this.y_("Offline" /* OnlineState.Offline */)));
        }
        /**
         * Explicitly sets the OnlineState to the specified state.
         *
         * Note that this resets our timers / failure counters, etc. used by our
         * Offline heuristics, so must not be used in place of
         * handleWatchStreamStart() and handleWatchStreamFailure().
         */    set(e) {
            this.b_(), this.m_ = 0, "Online" /* OnlineState.Online */ === e && (
            // We've connected to watch at least once. Don't warn the developer
            // about being offline going forward.
            this.g_ = !1), this.y_(e);
        }
        y_(e) {
            e !== this.state && (this.state = e, this.onlineStateHandler(e));
        }
        w_(e) {
            const t = `Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
            this.g_ ? (__PRIVATE_logError(t), this.g_ = !1) : __PRIVATE_logDebug("OnlineStateTracker", t);
        }
        b_() {
            null !== this.f_ && (this.f_.cancel(), this.f_ = null);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_RemoteStoreImpl {
        constructor(
        /**
         * The local store, used to fill the write pipeline with outbound mutations.
         */
        e, 
        /** The client-side proxy for interacting with the backend. */
        t, n, r, i) {
            this.localStore = e, this.datastore = t, this.asyncQueue = n, this.remoteSyncer = {}, 
            /**
             * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
             * LocalStore via fillWritePipeline() and have or will send to the write
             * stream.
             *
             * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
             * restart the write stream. When the stream is established the writes in the
             * pipeline will be sent in order.
             *
             * Writes remain in writePipeline until they are acknowledged by the backend
             * and thus will automatically be re-sent if the stream is interrupted /
             * restarted before they're acknowledged.
             *
             * Write responses from the backend are linked to their originating request
             * purely based on order, and so we can just shift() writes from the front of
             * the writePipeline as we receive responses.
             */
            this.D_ = [], 
            /**
             * A mapping of watched targets that the client cares about tracking and the
             * user has explicitly called a 'listen' for this target.
             *
             * These targets may or may not have been sent to or acknowledged by the
             * server. On re-establishing the listen stream, these targets should be sent
             * to the server. The targets removed with unlistens are removed eagerly
             * without waiting for confirmation from the listen stream.
             */
            this.C_ = new Map, 
            /**
             * A set of reasons for why the RemoteStore may be offline. If empty, the
             * RemoteStore may start its network connections.
             */
            this.v_ = new Set, 
            /**
             * Event handlers that get called when the network is disabled or enabled.
             *
             * PORTING NOTE: These functions are used on the Web client to create the
             * underlying streams (to support tree-shakeable streams). On Android and iOS,
             * the streams are created during construction of RemoteStore.
             */
            this.F_ = [], this.M_ = i, this.M_.io((e => {
                n.enqueueAndForget((async () => {
                    // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
                    // network becomes unreachable as we don't have any other way to tear
                    // down our streams.
                    __PRIVATE_canUseNetwork(this) && (__PRIVATE_logDebug("RemoteStore", "Restarting streams for network reachability change."), 
                    await async function __PRIVATE_restartNetwork(e) {
                        const t = __PRIVATE_debugCast(e);
                        t.v_.add(4 /* OfflineCause.ConnectivityChange */), await __PRIVATE_disableNetworkInternal(t), 
                        t.x_.set("Unknown" /* OnlineState.Unknown */), t.v_.delete(4 /* OfflineCause.ConnectivityChange */), 
                        await __PRIVATE_enableNetworkInternal(t);
                    }(this));
                }));
            })), this.x_ = new __PRIVATE_OnlineStateTracker(n, r);
        }
    }

    async function __PRIVATE_enableNetworkInternal(e) {
        if (__PRIVATE_canUseNetwork(e)) for (const t of e.F_) await t(/* enabled= */ !0);
    }

    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */ async function __PRIVATE_disableNetworkInternal(e) {
        for (const t of e.F_) await t(/* enabled= */ !1);
    }

    function __PRIVATE_canUseNetwork(e) {
        return 0 === __PRIVATE_debugCast(e).v_.size;
    }

    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */ async function __PRIVATE_disableNetworkUntilRecovery(e, t, n) {
        if (!__PRIVATE_isIndexedDbTransactionError(t)) throw t;
        e.v_.add(1 /* OfflineCause.IndexedDbFailed */), 
        // Disable network and raise offline snapshots
        await __PRIVATE_disableNetworkInternal(e), e.x_.set("Offline" /* OnlineState.Offline */), 
        n || (
        // Use a simple read operation to determine if IndexedDB recovered.
        // Ideally, we would expose a health check directly on SimpleDb, but
        // RemoteStore only has access to persistence through LocalStore.
        n = () => __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e.localStore)), 
        // Probe IndexedDB periodically and re-enable network
        e.asyncQueue.enqueueRetryable((async () => {
            __PRIVATE_logDebug("RemoteStore", "Retrying IndexedDB access"), await n(), e.v_.delete(1 /* OfflineCause.IndexedDbFailed */), 
            await __PRIVATE_enableNetworkInternal(e);
        }));
    }

    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */ function __PRIVATE_executeWithRecovery(e, t) {
        return t().catch((n => __PRIVATE_disableNetworkUntilRecovery(e, n, t)));
    }

    async function __PRIVATE_fillWritePipeline(e) {
        const t = __PRIVATE_debugCast(e), n = __PRIVATE_ensureWriteStream(t);
        let r = t.D_.length > 0 ? t.D_[t.D_.length - 1].batchId : -1;
        for (;__PRIVATE_canAddToWritePipeline(t); ) try {
            const e = await __PRIVATE_localStoreGetNextMutationBatch(t.localStore, r);
            if (null === e) {
                0 === t.D_.length && n.Xo();
                break;
            }
            r = e.batchId, __PRIVATE_addToWritePipeline(t, e);
        } catch (e) {
            await __PRIVATE_disableNetworkUntilRecovery(t, e);
        }
        __PRIVATE_shouldStartWriteStream(t) && __PRIVATE_startWriteStream(t);
    }

    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */ function __PRIVATE_canAddToWritePipeline(e) {
        return __PRIVATE_canUseNetwork(e) && e.D_.length < 10;
    }

    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */ function __PRIVATE_addToWritePipeline(e, t) {
        e.D_.push(t);
        const n = __PRIVATE_ensureWriteStream(e);
        n.Jo() && n.P_ && n.I_(t.mutations);
    }

    function __PRIVATE_shouldStartWriteStream(e) {
        return __PRIVATE_canUseNetwork(e) && !__PRIVATE_ensureWriteStream(e).Ho() && e.D_.length > 0;
    }

    function __PRIVATE_startWriteStream(e) {
        __PRIVATE_ensureWriteStream(e).start();
    }

    async function __PRIVATE_onWriteStreamOpen(e) {
        __PRIVATE_ensureWriteStream(e).d_();
    }

    async function __PRIVATE_onWriteHandshakeComplete(e) {
        const t = __PRIVATE_ensureWriteStream(e);
        // Send the write pipeline now that the stream is established.
            for (const n of e.D_) t.I_(n.mutations);
    }

    async function __PRIVATE_onMutationResult(e, t, n) {
        const r = e.D_.shift(), i = MutationBatchResult.from(r, t, n);
        await __PRIVATE_executeWithRecovery(e, (() => e.remoteSyncer.applySuccessfulWrite(i))), 
        // It's possible that with the completion of this mutation another
        // slot has freed up.
        await __PRIVATE_fillWritePipeline(e);
    }

    async function __PRIVATE_onWriteStreamClose(e, t) {
        // If the write stream closed after the write handshake completes, a write
        // operation failed and we fail the pending operation.
        t && __PRIVATE_ensureWriteStream(e).P_ && 
        // This error affects the actual write.
        await async function __PRIVATE_handleWriteError(e, t) {
            // Only handle permanent errors here. If it's transient, just let the retry
            // logic kick in.
            if (function __PRIVATE_isPermanentWriteError(e) {
                return __PRIVATE_isPermanentError(e) && e !== D.ABORTED;
            }(t.code)) {
                // This was a permanent error, the request itself was the problem
                // so it's not going to succeed if we resend it.
                const n = e.D_.shift();
                // In this case it's also unlikely that the server itself is melting
                // down -- this was just a bad request so inhibit backoff on the next
                // restart.
                            __PRIVATE_ensureWriteStream(e).Zo(), await __PRIVATE_executeWithRecovery(e, (() => e.remoteSyncer.rejectFailedWrite(n.batchId, t))), 
                // It's possible that with the completion of this mutation
                // another slot has freed up.
                await __PRIVATE_fillWritePipeline(e);
            }
        }(e, t), 
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        __PRIVATE_shouldStartWriteStream(e) && __PRIVATE_startWriteStream(e);
    }

    async function __PRIVATE_remoteStoreHandleCredentialChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        n.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug("RemoteStore", "RemoteStore received new credentials");
        const r = __PRIVATE_canUseNetwork(n);
        // Tear down and re-create our network streams. This will ensure we get a
        // fresh auth token for the new user and re-fill the write pipeline with
        // new mutations from the LocalStore (since mutations are per-user).
            n.v_.add(3 /* OfflineCause.CredentialChange */), await __PRIVATE_disableNetworkInternal(n), 
        r && 
        // Don't set the network status to Unknown if we are offline.
        n.x_.set("Unknown" /* OnlineState.Unknown */), await n.remoteSyncer.handleCredentialChange(t), 
        n.v_.delete(3 /* OfflineCause.CredentialChange */), await __PRIVATE_enableNetworkInternal(n);
    }

    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */ async function __PRIVATE_remoteStoreApplyPrimaryState(e, t) {
        const n = __PRIVATE_debugCast(e);
        t ? (n.v_.delete(2 /* OfflineCause.IsSecondary */), await __PRIVATE_enableNetworkInternal(n)) : t || (n.v_.add(2 /* OfflineCause.IsSecondary */), 
        await __PRIVATE_disableNetworkInternal(n), n.x_.set("Unknown" /* OnlineState.Unknown */));
    }

    /**
     * If not yet initialized, registers the WriteStream and its network state
     * callback with `remoteStoreImpl`. Returns the existing stream if one is
     * already available.
     *
     * PORTING NOTE: On iOS and Android, the WriteStream gets registered on startup.
     * This is not done on Web to allow it to be tree-shaken.
     */ function __PRIVATE_ensureWriteStream(e) {
        return e.B_ || (
        // Create stream (but note that it is not started yet).
        e.B_ = function __PRIVATE_newPersistentWriteStream(e, t, n) {
            const r = __PRIVATE_debugCast(e);
            return r.R_(), new __PRIVATE_PersistentWriteStream(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
        }(e.datastore, e.asyncQueue, {
            Po: __PRIVATE_onWriteStreamOpen.bind(null, e),
            To: __PRIVATE_onWriteStreamClose.bind(null, e),
            E_: __PRIVATE_onWriteHandshakeComplete.bind(null, e),
            T_: __PRIVATE_onMutationResult.bind(null, e)
        }), e.F_.push((async t => {
            t ? (e.B_.Zo(), 
            // This will start the write stream if necessary.
            await __PRIVATE_fillWritePipeline(e)) : (await e.B_.stop(), e.D_.length > 0 && (__PRIVATE_logDebug("RemoteStore", `Stopping write stream with ${e.D_.length} pending writes`), 
            e.D_ = []));
        }))), e.B_;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents an operation scheduled to be run in the future on an AsyncQueue.
     *
     * It is created via DelayedOperation.createAndSchedule().
     *
     * Supports cancellation (via cancel()) and early execution (via skipDelay()).
     *
     * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
     * in newer versions of TypeScript defines `finally`, which is not available in
     * IE.
     */
    class DelayedOperation {
        constructor(e, t, n, r, i) {
            this.asyncQueue = e, this.timerId = t, this.targetTimeMs = n, this.op = r, this.removalCallback = i, 
            this.deferred = new __PRIVATE_Deferred, this.then = this.deferred.promise.then.bind(this.deferred.promise), 
            // It's normal for the deferred promise to be canceled (due to cancellation)
            // and so we attach a dummy catch callback to avoid
            // 'UnhandledPromiseRejectionWarning' log spam.
            this.deferred.promise.catch((e => {}));
        }
        get promise() {
            return this.deferred.promise;
        }
        /**
         * Creates and returns a DelayedOperation that has been scheduled to be
         * executed on the provided asyncQueue after the provided delayMs.
         *
         * @param asyncQueue - The queue to schedule the operation on.
         * @param id - A Timer ID identifying the type of operation this is.
         * @param delayMs - The delay (ms) before the operation should be scheduled.
         * @param op - The operation to run.
         * @param removalCallback - A callback to be called synchronously once the
         *   operation is executed or canceled, notifying the AsyncQueue to remove it
         *   from its delayedOperations list.
         *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
         *   the DelayedOperation class public.
         */    static createAndSchedule(e, t, n, r, i) {
            const s = Date.now() + n, o = new DelayedOperation(e, t, s, r, i);
            return o.start(n), o;
        }
        /**
         * Starts the timer. This is called immediately after construction by
         * createAndSchedule().
         */    start(e) {
            this.timerHandle = setTimeout((() => this.handleDelayElapsed()), e);
        }
        /**
         * Queues the operation to run immediately (if it hasn't already been run or
         * canceled).
         */    skipDelay() {
            return this.handleDelayElapsed();
        }
        /**
         * Cancels the operation if it hasn't already been executed or canceled. The
         * promise will be rejected.
         *
         * As long as the operation has not yet been run, calling cancel() provides a
         * guarantee that the operation will not be run.
         */    cancel(e) {
            null !== this.timerHandle && (this.clearTimeout(), this.deferred.reject(new FirestoreError(D.CANCELLED, "Operation cancelled" + (e ? ": " + e : ""))));
        }
        handleDelayElapsed() {
            this.asyncQueue.enqueueAndForget((() => null !== this.timerHandle ? (this.clearTimeout(), 
            this.op().then((e => this.deferred.resolve(e)))) : Promise.resolve()));
        }
        clearTimeout() {
            null !== this.timerHandle && (this.removalCallback(this), clearTimeout(this.timerHandle), 
            this.timerHandle = null);
        }
    }

    /**
     * Returns a FirestoreError that can be surfaced to the user if the provided
     * error is an IndexedDbTransactionError. Re-throws the error otherwise.
     */ function __PRIVATE_wrapInUserErrorIfRecoverable(e, t) {
        if (__PRIVATE_logError("AsyncQueue", `${t}: ${e}`), __PRIVATE_isIndexedDbTransactionError(e)) return new FirestoreError(D.UNAVAILABLE, `${t}: ${e}`);
        throw e;
    }

    class __PRIVATE_EventManagerImpl {
        constructor() {
            this.queries = new ObjectMap((e => __PRIVATE_canonifyQuery(e)), __PRIVATE_queryEquals), 
            this.onlineState = "Unknown" /* OnlineState.Unknown */ , this.Q_ = new Set;
        }
    }

    // Call all global snapshot listeners that have been set.
    function __PRIVATE_raiseSnapshotsInSyncEvent(e) {
        e.Q_.forEach((e => {
            e.next();
        }));
    }

    /**
     * An implementation of `SyncEngine` coordinating with other parts of SDK.
     *
     * The parts of SyncEngine that act as a callback to RemoteStore need to be
     * registered individually. This is done in `syncEngineWrite()` and
     * `syncEngineListen()` (as well as `applyPrimaryState()`) as these methods
     * serve as entry points to RemoteStore's functionality.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */ class __PRIVATE_SyncEngineImpl {
        constructor(e, t, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        r, i, s) {
            this.localStore = e, this.remoteStore = t, this.eventManager = n, this.sharedClientState = r, 
            this.currentUser = i, this.maxConcurrentLimboResolutions = s, this.ma = {}, this.fa = new ObjectMap((e => __PRIVATE_canonifyQuery(e)), __PRIVATE_queryEquals), 
            this.ga = new Map, 
            /**
             * The keys of documents that are in limbo for which we haven't yet started a
             * limbo resolution query. The strings in this set are the result of calling
             * `key.path.canonicalString()` where `key` is a `DocumentKey` object.
             *
             * The `Set` type was chosen because it provides efficient lookup and removal
             * of arbitrary elements and it also maintains insertion order, providing the
             * desired queue-like FIFO semantics.
             */
            this.pa = new Set, 
            /**
             * Keeps track of the target ID for each document that is in limbo with an
             * active target.
             */
            this.ya = new SortedMap(DocumentKey.comparator), 
            /**
             * Keeps track of the information about an active limbo resolution for each
             * active target ID that was started for the purpose of limbo resolution.
             */
            this.wa = new Map, this.Sa = new __PRIVATE_ReferenceSet, 
            /** Stores user completion handlers, indexed by User and BatchId. */
            this.ba = {}, 
            /** Stores user callbacks waiting for all pending writes to be acknowledged. */
            this.Da = new Map, this.Ca = __PRIVATE_TargetIdGenerator.Bn(), this.onlineState = "Unknown" /* OnlineState.Unknown */ , 
            // The primary state is set to `true` or `false` immediately after Firestore
            // startup. In the interim, a client should only be considered primary if
            // `isPrimary` is true.
            this.va = void 0;
        }
        get isPrimaryClient() {
            return !0 === this.va;
        }
    }

    /**
     * Initiates the write of local mutation batch which involves adding the
     * writes to the mutation queue, notifying the remote store about new
     * mutations and raising events for any changes this write caused.
     *
     * The promise returned by this call is resolved when the above steps
     * have completed, *not* when the write was acked by the backend. The
     * userCallback is resolved once the write was acked/rejected by the
     * backend (or failed locally for any other reason).
     */ async function __PRIVATE_syncEngineWrite(e, t, n) {
        const r = __PRIVATE_syncEngineEnsureWriteCallbacks(e);
        try {
            const e = await function __PRIVATE_localStoreWriteLocally(e, t) {
                const n = __PRIVATE_debugCast(e), r = Timestamp.now(), i = t.reduce(((e, t) => e.add(t.key)), __PRIVATE_documentKeySet());
                let s, o;
                return n.persistence.runTransaction("Locally write mutations", "readwrite", (e => {
                    // Figure out which keys do not have a remote version in the cache, this
                    // is needed to create the right overlay mutation: if no remote version
                    // presents, we do not need to create overlays as patch mutations.
                    // TODO(Overlay): Is there a better way to determine this? Using the
                    //  document version does not work because local mutations set them back
                    //  to 0.
                    let _ = __PRIVATE_mutableDocumentMap(), a = __PRIVATE_documentKeySet();
                    return n.os.getEntries(e, i).next((e => {
                        _ = e, _.forEach(((e, t) => {
                            t.isValidDocument() || (a = a.add(e));
                        }));
                    })).next((() => n.localDocuments.getOverlayedDocuments(e, _))).next((i => {
                        s = i;
                        // For non-idempotent mutations (such as `FieldValue.increment()`),
                        // we record the base state in a separate patch mutation. This is
                        // later used to guarantee consistent values and prevents flicker
                        // even if the backend sends us an update that already includes our
                        // transform.
                        const o = [];
                        for (const e of t) {
                            const t = __PRIVATE_mutationExtractBaseValue(e, s.get(e.key).overlayedDocument);
                            null != t && 
                            // NOTE: The base state should only be applied if there's some
                            // existing document to override, so use a Precondition of
                            // exists=true
                            o.push(new __PRIVATE_PatchMutation(e.key, t, __PRIVATE_extractFieldMask(t.value.mapValue), Precondition.exists(!0)));
                        }
                        return n.mutationQueue.addMutationBatch(e, r, o, t);
                    })).next((t => {
                        o = t;
                        const r = t.applyToLocalDocumentSet(s, a);
                        return n.documentOverlayCache.saveOverlays(e, t.batchId, r);
                    }));
                })).then((() => ({
                    batchId: o.batchId,
                    changes: __PRIVATE_convertOverlayedDocumentMapToDocumentMap(s)
                })));
            }(r.localStore, t);
            r.sharedClientState.addPendingMutation(e.batchId), function __PRIVATE_addMutationCallback(e, t, n) {
                let r = e.ba[e.currentUser.toKey()];
                r || (r = new SortedMap(__PRIVATE_primitiveComparator));
                r = r.insert(t, n), e.ba[e.currentUser.toKey()] = r;
            }
            /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */ (r, e.batchId, n), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(r, e.changes), 
            await __PRIVATE_fillWritePipeline(r.remoteStore);
        } catch (e) {
            // If we can't persist the mutation, we reject the user callback and
            // don't send the mutation. The user can then retry the write.
            const t = __PRIVATE_wrapInUserErrorIfRecoverable(e, "Failed to persist write");
            n.reject(t);
        }
    }

    /**
     * Applies an OnlineState change to the sync engine and notifies any views of
     * the change.
     */ function __PRIVATE_syncEngineApplyOnlineStateChange(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
            if (r.isPrimaryClient && 0 /* OnlineStateSource.RemoteStore */ === n || !r.isPrimaryClient && 1 /* OnlineStateSource.SharedClientState */ === n) {
            const e = [];
            r.fa.forEach(((n, r) => {
                const i = r.view.K_(t);
                i.snapshot && e.push(i.snapshot);
            })), function __PRIVATE_eventManagerOnOnlineStateChange(e, t) {
                const n = __PRIVATE_debugCast(e);
                n.onlineState = t;
                let r = !1;
                n.queries.forEach(((e, n) => {
                    for (const e of n.listeners) 
                    // Run global snapshot listeners if a consistent snapshot has been emitted.
                    e.K_(t) && (r = !0);
                })), r && __PRIVATE_raiseSnapshotsInSyncEvent(n);
            }(r.eventManager, t), e.length && r.ma.u_(e), r.onlineState = t, r.isPrimaryClient && r.sharedClientState.setOnlineState(t);
        }
    }

    async function __PRIVATE_syncEngineApplySuccessfulWrite(e, t) {
        const n = __PRIVATE_debugCast(e), r = t.batch.batchId;
        try {
            const e = await __PRIVATE_localStoreAcknowledgeBatch(n.localStore, t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught
            // up), so we raise user callbacks first so that they consistently happen
            // before listen events.
                    __PRIVATE_processUserCallback(n, r, /*error=*/ null), __PRIVATE_triggerPendingWritesCallbacks(n, r), 
            n.sharedClientState.updateMutationState(r, "acknowledged"), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e);
        } catch (e) {
            await __PRIVATE_ignoreIfPrimaryLeaseLoss(e);
        }
    }

    async function __PRIVATE_syncEngineRejectFailedWrite(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        try {
            const e = await function __PRIVATE_localStoreRejectBatch(e, t) {
                const n = __PRIVATE_debugCast(e);
                return n.persistence.runTransaction("Reject batch", "readwrite-primary", (e => {
                    let r;
                    return n.mutationQueue.lookupMutationBatch(e, t).next((t => (__PRIVATE_hardAssert(null !== t), 
                    r = t.keys(), n.mutationQueue.removeMutationBatch(e, t)))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, r))).next((() => n.localDocuments.getDocuments(e, r)));
                }));
            }
            /**
     * Returns the largest (latest) batch id in mutation queue that is pending
     * server response.
     *
     * Returns `BATCHID_UNKNOWN` if the queue is empty.
     */ (r.localStore, t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught up),
            // so we raise user callbacks first so that they consistently happen before
            // listen events.
                    __PRIVATE_processUserCallback(r, t, n), __PRIVATE_triggerPendingWritesCallbacks(r, t), 
            r.sharedClientState.updateMutationState(t, "rejected", n), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(r, e);
        } catch (n) {
            await __PRIVATE_ignoreIfPrimaryLeaseLoss(n);
        }
    }

    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */ function __PRIVATE_triggerPendingWritesCallbacks(e, t) {
        (e.Da.get(t) || []).forEach((e => {
            e.resolve();
        })), e.Da.delete(t);
    }

    /** Reject all outstanding callbacks waiting for pending writes to complete. */ function __PRIVATE_processUserCallback(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        let i = r.ba[r.currentUser.toKey()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
            if (i) {
            const e = i.get(t);
            e && (n ? e.reject(n) : e.resolve(), i = i.remove(t)), r.ba[r.currentUser.toKey()] = i;
        }
    }

    async function __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(e, t, n) {
        const r = __PRIVATE_debugCast(e), i = [], s = [], o = [];
        r.fa.isEmpty() || (r.fa.forEach(((e, _) => {
            o.push(r.Fa(_, t, n).then((e => {
                // Update views if there are actual changes.
                if (
                // If there are changes, or we are handling a global snapshot, notify
                // secondary clients to update query state.
                (e || n) && r.isPrimaryClient && r.sharedClientState.updateQueryState(_.targetId, (null == e ? void 0 : e.fromCache) ? "not-current" : "current"), 
                e) {
                    i.push(e);
                    const t = __PRIVATE_LocalViewChanges.Ki(_.targetId, e);
                    s.push(t);
                }
            })));
        })), await Promise.all(o), r.ma.u_(i), await async function __PRIVATE_localStoreNotifyLocalViewChanges(e, t) {
            const n = __PRIVATE_debugCast(e);
            try {
                await n.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (e => PersistencePromise.forEach(t, (t => PersistencePromise.forEach(t.qi, (r => n.persistence.referenceDelegate.addReference(e, t.targetId, r))).next((() => PersistencePromise.forEach(t.Qi, (r => n.persistence.referenceDelegate.removeReference(e, t.targetId, r)))))))));
            } catch (e) {
                if (!__PRIVATE_isIndexedDbTransactionError(e)) throw e;
                // If `notifyLocalViewChanges` fails, we did not advance the sequence
                // number for the documents that were included in this transaction.
                // This might trigger them to be deleted earlier than they otherwise
                // would have, but it should not invalidate the integrity of the data.
                __PRIVATE_logDebug("LocalStore", "Failed to update sequence numbers: " + e);
            }
            for (const e of t) {
                const t = e.targetId;
                if (!e.fromCache) {
                    const e = n.ns.get(t), r = e.snapshotVersion, i = e.withLastLimboFreeSnapshotVersion(r);
                    // Advance the last limbo free snapshot version
                                    n.ns = n.ns.insert(t, i);
                }
            }
        }(r.localStore, s));
    }

    async function __PRIVATE_syncEngineHandleCredentialChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        if (!n.currentUser.isEqual(t)) {
            __PRIVATE_logDebug("SyncEngine", "User change. New user:", t.toKey());
            const e = await __PRIVATE_localStoreHandleUserChange(n.localStore, t);
            n.currentUser = t, 
            // Fails tasks waiting for pending writes requested by previous user.
            function __PRIVATE_rejectOutstandingPendingWritesCallbacks(e, t) {
                e.Da.forEach((e => {
                    e.forEach((e => {
                        e.reject(new FirestoreError(D.CANCELLED, t));
                    }));
                })), e.Da.clear();
            }(n, "'waitForPendingWrites' promise is rejected due to a user change."), 
            // TODO(b/114226417): Consider calling this only in the primary tab.
            n.sharedClientState.handleUserChange(t, e.removedBatchIds, e.addedBatchIds), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e.us);
        }
    }

    function __PRIVATE_syncEngineEnsureWriteCallbacks(e) {
        const t = __PRIVATE_debugCast(e);
        return t.remoteStore.remoteSyncer.applySuccessfulWrite = __PRIVATE_syncEngineApplySuccessfulWrite.bind(null, t), 
        t.remoteStore.remoteSyncer.rejectFailedWrite = __PRIVATE_syncEngineRejectFailedWrite.bind(null, t), 
        t;
    }

    class MemoryOfflineComponentProvider {
        constructor() {
            this.synchronizeTabs = !1;
        }
        async initialize(e) {
            this.serializer = __PRIVATE_newSerializer(e.databaseInfo.databaseId), this.sharedClientState = this.createSharedClientState(e), 
            this.persistence = this.createPersistence(e), await this.persistence.start(), this.localStore = this.createLocalStore(e), 
            this.gcScheduler = this.createGarbageCollectionScheduler(e, this.localStore), this.indexBackfillerScheduler = this.createIndexBackfillerScheduler(e, this.localStore);
        }
        createGarbageCollectionScheduler(e, t) {
            return null;
        }
        createIndexBackfillerScheduler(e, t) {
            return null;
        }
        createLocalStore(e) {
            return __PRIVATE_newLocalStore(this.persistence, new __PRIVATE_QueryEngine, e.initialUser, this.serializer);
        }
        createPersistence(e) {
            return new __PRIVATE_MemoryPersistence(__PRIVATE_MemoryEagerDelegate.Hr, this.serializer);
        }
        createSharedClientState(e) {
            return new __PRIVATE_MemorySharedClientState;
        }
        async terminate() {
            this.gcScheduler && this.gcScheduler.stop(), await this.sharedClientState.shutdown(), 
            await this.persistence.shutdown();
        }
    }

    /**
     * Initializes and wires the components that are needed to interface with the
     * network.
     */ class OnlineComponentProvider {
        async initialize(e, t) {
            this.localStore || (this.localStore = e.localStore, this.sharedClientState = e.sharedClientState, 
            this.datastore = this.createDatastore(t), this.remoteStore = this.createRemoteStore(t), 
            this.eventManager = this.createEventManager(t), this.syncEngine = this.createSyncEngine(t, 
            /* startAsPrimary=*/ !e.synchronizeTabs), this.sharedClientState.onlineStateHandler = e => __PRIVATE_syncEngineApplyOnlineStateChange(this.syncEngine, e, 1 /* OnlineStateSource.SharedClientState */), 
            this.remoteStore.remoteSyncer.handleCredentialChange = __PRIVATE_syncEngineHandleCredentialChange.bind(null, this.syncEngine), 
            await __PRIVATE_remoteStoreApplyPrimaryState(this.remoteStore, this.syncEngine.isPrimaryClient));
        }
        createEventManager(e) {
            return function __PRIVATE_newEventManager() {
                return new __PRIVATE_EventManagerImpl;
            }();
        }
        createDatastore(e) {
            const t = __PRIVATE_newSerializer(e.databaseInfo.databaseId), n = function __PRIVATE_newConnection(e) {
                return new __PRIVATE_WebChannelConnection(e);
            }
            /** Return the Platform-specific connectivity monitor. */ (e.databaseInfo);
            return function __PRIVATE_newDatastore(e, t, n, r) {
                return new __PRIVATE_DatastoreImpl(e, t, n, r);
            }(e.authCredentials, e.appCheckCredentials, n, t);
        }
        createRemoteStore(e) {
            return function __PRIVATE_newRemoteStore(e, t, n, r, i) {
                return new __PRIVATE_RemoteStoreImpl(e, t, n, r, i);
            }
            /** Re-enables the network. Idempotent. */ (this.localStore, this.datastore, e.asyncQueue, (e => __PRIVATE_syncEngineApplyOnlineStateChange(this.syncEngine, e, 0 /* OnlineStateSource.RemoteStore */)), function __PRIVATE_newConnectivityMonitor() {
                return __PRIVATE_BrowserConnectivityMonitor.C() ? new __PRIVATE_BrowserConnectivityMonitor : new __PRIVATE_NoopConnectivityMonitor;
            }());
        }
        createSyncEngine(e, t) {
            return function __PRIVATE_newSyncEngine(e, t, n, 
            // PORTING NOTE: Manages state synchronization in multi-tab environments.
            r, i, s, o) {
                const _ = new __PRIVATE_SyncEngineImpl(e, t, n, r, i, s);
                return o && (_.va = !0), _;
            }(this.localStore, this.remoteStore, this.eventManager, this.sharedClientState, e.initialUser, e.maxConcurrentLimboResolutions, t);
        }
        terminate() {
            return async function __PRIVATE_remoteStoreShutdown(e) {
                const t = __PRIVATE_debugCast(e);
                __PRIVATE_logDebug("RemoteStore", "RemoteStore shutting down."), t.v_.add(5 /* OfflineCause.Shutdown */), 
                await __PRIVATE_disableNetworkInternal(t), t.M_.shutdown(), 
                // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                // triggering spurious listener events with cached data, etc.
                t.x_.set("Unknown" /* OnlineState.Unknown */);
            }(this.remoteStore);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * FirestoreClient is a top-level class that constructs and owns all of the //
     * pieces of the client SDK architecture. It is responsible for creating the //
     * async queue that is shared by all of the other components in the system. //
     */
    class FirestoreClient {
        constructor(e, t, 
        /**
         * Asynchronous queue responsible for all of our internal processing. When
         * we get incoming work from the user (via public API) or the network
         * (incoming GRPC messages), we should always schedule onto this queue.
         * This ensures all of our work is properly serialized (e.g. we don't
         * start processing a new operation while the previous one is waiting for
         * an async I/O to complete).
         */
        n, r) {
            this.authCredentials = e, this.appCheckCredentials = t, this.asyncQueue = n, this.databaseInfo = r, 
            this.user = User.UNAUTHENTICATED, this.clientId = __PRIVATE_AutoId.V(), this.authCredentialListener = () => Promise.resolve(), 
            this.appCheckCredentialListener = () => Promise.resolve(), this.authCredentials.start(n, (async e => {
                __PRIVATE_logDebug("FirestoreClient", "Received user=", e.uid), await this.authCredentialListener(e), 
                this.user = e;
            })), this.appCheckCredentials.start(n, (e => (__PRIVATE_logDebug("FirestoreClient", "Received new app check token=", e), 
            this.appCheckCredentialListener(e, this.user))));
        }
        async getConfiguration() {
            return {
                asyncQueue: this.asyncQueue,
                databaseInfo: this.databaseInfo,
                clientId: this.clientId,
                authCredentials: this.authCredentials,
                appCheckCredentials: this.appCheckCredentials,
                initialUser: this.user,
                maxConcurrentLimboResolutions: 100
            };
        }
        setCredentialChangeListener(e) {
            this.authCredentialListener = e;
        }
        setAppCheckTokenChangeListener(e) {
            this.appCheckCredentialListener = e;
        }
        /**
         * Checks that the client has not been terminated. Ensures that other methods on //
         * this class cannot be called after the client is terminated. //
         */    verifyNotTerminated() {
            if (this.asyncQueue.isShuttingDown) throw new FirestoreError(D.FAILED_PRECONDITION, "The client has already been terminated.");
        }
        terminate() {
            this.asyncQueue.enterRestrictedMode();
            const e = new __PRIVATE_Deferred;
            return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async () => {
                try {
                    this._onlineComponents && await this._onlineComponents.terminate(), this._offlineComponents && await this._offlineComponents.terminate(), 
                    // The credentials provider must be terminated after shutting down the
                    // RemoteStore as it will prevent the RemoteStore from retrieving auth
                    // tokens.
                    this.authCredentials.shutdown(), this.appCheckCredentials.shutdown(), e.resolve();
                } catch (t) {
                    const n = __PRIVATE_wrapInUserErrorIfRecoverable(t, "Failed to shutdown persistence");
                    e.reject(n);
                }
            })), e.promise;
        }
    }

    async function __PRIVATE_setOfflineComponentProvider(e, t) {
        e.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug("FirestoreClient", "Initializing OfflineComponentProvider");
        const n = await e.getConfiguration();
        await t.initialize(n);
        let r = n.initialUser;
        e.setCredentialChangeListener((async e => {
            r.isEqual(e) || (await __PRIVATE_localStoreHandleUserChange(t.localStore, e), r = e);
        })), 
        // When a user calls clearPersistence() in one client, all other clients
        // need to be terminated to allow the delete to succeed.
        t.persistence.setDatabaseDeletedListener((() => e.terminate())), e._offlineComponents = t;
    }

    async function __PRIVATE_setOnlineComponentProvider(e, t) {
        e.asyncQueue.verifyOperationInProgress();
        const n = await __PRIVATE_ensureOfflineComponents(e);
        __PRIVATE_logDebug("FirestoreClient", "Initializing OnlineComponentProvider");
        const r = await e.getConfiguration();
        await t.initialize(n, r), 
        // The CredentialChangeListener of the online component provider takes
        // precedence over the offline component provider.
        e.setCredentialChangeListener((e => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, e))), 
        e.setAppCheckTokenChangeListener(((e, n) => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, n))), 
        e._onlineComponents = t;
    }

    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */ function __PRIVATE_canFallbackFromIndexedDbError(e) {
        return "FirebaseError" === e.name ? e.code === D.FAILED_PRECONDITION || e.code === D.UNIMPLEMENTED : !("undefined" != typeof DOMException && e instanceof DOMException) || (
        // When the browser is out of quota we could get either quota exceeded
        // or an aborted error depending on whether the error happened during
        // schema migration.
        22 === e.code || 20 === e.code || 
        // Firefox Private Browsing mode disables IndexedDb and returns
        // INVALID_STATE for any usage.
        11 === e.code);
    }

    async function __PRIVATE_ensureOfflineComponents(e) {
        if (!e._offlineComponents) if (e._uninitializedComponentsProvider) {
            __PRIVATE_logDebug("FirestoreClient", "Using user provided OfflineComponentProvider");
            try {
                await __PRIVATE_setOfflineComponentProvider(e, e._uninitializedComponentsProvider._offline);
            } catch (t) {
                const n = t;
                if (!__PRIVATE_canFallbackFromIndexedDbError(n)) throw n;
                __PRIVATE_logWarn("Error using user provided cache. Falling back to memory cache: " + n), 
                await __PRIVATE_setOfflineComponentProvider(e, new MemoryOfflineComponentProvider);
            }
        } else __PRIVATE_logDebug("FirestoreClient", "Using default OfflineComponentProvider"), 
        await __PRIVATE_setOfflineComponentProvider(e, new MemoryOfflineComponentProvider);
        return e._offlineComponents;
    }

    async function __PRIVATE_ensureOnlineComponents(e) {
        return e._onlineComponents || (e._uninitializedComponentsProvider ? (__PRIVATE_logDebug("FirestoreClient", "Using user provided OnlineComponentProvider"), 
        await __PRIVATE_setOnlineComponentProvider(e, e._uninitializedComponentsProvider._online)) : (__PRIVATE_logDebug("FirestoreClient", "Using default OnlineComponentProvider"), 
        await __PRIVATE_setOnlineComponentProvider(e, new OnlineComponentProvider))), e._onlineComponents;
    }

    function __PRIVATE_getSyncEngine(e) {
        return __PRIVATE_ensureOnlineComponents(e).then((e => e.syncEngine));
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Compares two `ExperimentalLongPollingOptions` objects for equality.
     */
    /**
     * Creates and returns a new `ExperimentalLongPollingOptions` with the same
     * option values as the given instance.
     */
    function __PRIVATE_cloneLongPollingOptions(e) {
        const t = {};
        return void 0 !== e.timeoutSeconds && (t.timeoutSeconds = e.timeoutSeconds), t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const me = new Map;

    /**
     * An instance map that ensures only one Datastore exists per Firestore
     * instance.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function __PRIVATE_validateNonEmptyArgument(e, t, n) {
        if (!n) throw new FirestoreError(D.INVALID_ARGUMENT, `Function ${e}() cannot be called with an empty ${t}.`);
    }

    /**
     * Validates that two boolean options are not set at the same time.
     * @internal
     */ function __PRIVATE_validateIsNotUsedTogether(e, t, n, r) {
        if (!0 === t && !0 === r) throw new FirestoreError(D.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
    }

    /**
     * Validates that `path` refers to a document (indicated by the fact it contains
     * an even numbers of segments).
     */ function __PRIVATE_validateDocumentPath(e) {
        if (!DocumentKey.isDocumentKey(e)) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`);
    }

    /**
     * Validates that `path` refers to a collection (indicated by the fact it
     * contains an odd numbers of segments).
     */ function __PRIVATE_validateCollectionPath(e) {
        if (DocumentKey.isDocumentKey(e)) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${e} has ${e.length}.`);
    }

    /**
     * Returns true if it's a non-null object without a custom prototype
     * (i.e. excludes Array, Date, etc.).
     */
    /** Returns a string describing the type / value of the provided input. */
    function __PRIVATE_valueDescription(e) {
        if (void 0 === e) return "undefined";
        if (null === e) return "null";
        if ("string" == typeof e) return e.length > 20 && (e = `${e.substring(0, 20)}...`), 
        JSON.stringify(e);
        if ("number" == typeof e || "boolean" == typeof e) return "" + e;
        if ("object" == typeof e) {
            if (e instanceof Array) return "an array";
            {
                const t = 
                /** try to get the constructor name for an object. */
                function __PRIVATE_tryGetCustomObjectType(e) {
                    if (e.constructor) return e.constructor.name;
                    return null;
                }
                /**
     * Casts `obj` to `T`, optionally unwrapping Compat types to expose the
     * underlying instance. Throws if  `obj` is not an instance of `T`.
     *
     * This cast is used in the Lite and Full SDK to verify instance types for
     * arguments passed to the public API.
     * @internal
     */ (e);
                return t ? `a custom ${t} object` : "an object";
            }
        }
        return "function" == typeof e ? "a function" : fail();
    }

    function __PRIVATE_cast(e, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        if ("_delegate" in e && (
        // Unwrap Compat types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e = e._delegate), !(e instanceof t)) {
            if (t.name === e.constructor.name) throw new FirestoreError(D.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
            {
                const n = __PRIVATE_valueDescription(e);
                throw new FirestoreError(D.INVALID_ARGUMENT, `Expected type '${t.name}', but it was: ${n}`);
            }
        }
        return e;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // settings() defaults:
    /**
     * A concrete type describing all the values that can be applied via a
     * user-supplied `FirestoreSettings` object. This is a separate type so that
     * defaults can be supplied and the value can be checked for equality.
     */
    class FirestoreSettingsImpl {
        constructor(e) {
            var t, n;
            if (void 0 === e.host) {
                if (void 0 !== e.ssl) throw new FirestoreError(D.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
                this.host = "firestore.googleapis.com", this.ssl = true;
            } else this.host = e.host, this.ssl = null === (t = e.ssl) || void 0 === t || t;
            if (this.credentials = e.credentials, this.ignoreUndefinedProperties = !!e.ignoreUndefinedProperties, 
            this.localCache = e.localCache, void 0 === e.cacheSizeBytes) this.cacheSizeBytes = 41943040; else {
                if (-1 !== e.cacheSizeBytes && e.cacheSizeBytes < 1048576) throw new FirestoreError(D.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
                this.cacheSizeBytes = e.cacheSizeBytes;
            }
            __PRIVATE_validateIsNotUsedTogether("experimentalForceLongPolling", e.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", e.experimentalAutoDetectLongPolling), 
            this.experimentalForceLongPolling = !!e.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = !1 : void 0 === e.experimentalAutoDetectLongPolling ? this.experimentalAutoDetectLongPolling = true : 
            // For backwards compatibility, coerce the value to boolean even though
            // the TypeScript compiler has narrowed the type to boolean already.
            // noinspection PointlessBooleanExpressionJS
            this.experimentalAutoDetectLongPolling = !!e.experimentalAutoDetectLongPolling, 
            this.experimentalLongPollingOptions = __PRIVATE_cloneLongPollingOptions(null !== (n = e.experimentalLongPollingOptions) && void 0 !== n ? n : {}), 
            function __PRIVATE_validateLongPollingOptions(e) {
                if (void 0 !== e.timeoutSeconds) {
                    if (isNaN(e.timeoutSeconds)) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);
                    if (e.timeoutSeconds < 5) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);
                    if (e.timeoutSeconds > 30) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`);
                }
            }
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
     */ (this.experimentalLongPollingOptions), this.useFetchStreams = !!e.useFetchStreams;
        }
        isEqual(e) {
            return this.host === e.host && this.ssl === e.ssl && this.credentials === e.credentials && this.cacheSizeBytes === e.cacheSizeBytes && this.experimentalForceLongPolling === e.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === e.experimentalAutoDetectLongPolling && function __PRIVATE_longPollingOptionsEqual(e, t) {
                return e.timeoutSeconds === t.timeoutSeconds;
            }(this.experimentalLongPollingOptions, e.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === e.ignoreUndefinedProperties && this.useFetchStreams === e.useFetchStreams;
        }
    }

    class Firestore$1 {
        /** @hideconstructor */
        constructor(e, t, n, r) {
            this._authCredentials = e, this._appCheckCredentials = t, this._databaseId = n, 
            this._app = r, 
            /**
             * Whether it's a Firestore or Firestore Lite instance.
             */
            this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new FirestoreSettingsImpl({}), 
            this._settingsFrozen = !1;
        }
        /**
         * The {@link @firebase/app#FirebaseApp} associated with this `Firestore` service
         * instance.
         */    get app() {
            if (!this._app) throw new FirestoreError(D.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
            return this._app;
        }
        get _initialized() {
            return this._settingsFrozen;
        }
        get _terminated() {
            return void 0 !== this._terminateTask;
        }
        _setSettings(e) {
            if (this._settingsFrozen) throw new FirestoreError(D.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
            this._settings = new FirestoreSettingsImpl(e), void 0 !== e.credentials && (this._authCredentials = function __PRIVATE_makeAuthCredentialsProvider(e) {
                if (!e) return new __PRIVATE_EmptyAuthCredentialsProvider;
                switch (e.type) {
                  case "firstParty":
                    return new __PRIVATE_FirstPartyAuthCredentialsProvider(e.sessionIndex || "0", e.iamToken || null, e.authTokenFactory || null);

                  case "provider":
                    return e.client;

                  default:
                    throw new FirestoreError(D.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
                }
            }(e.credentials));
        }
        _getSettings() {
            return this._settings;
        }
        _freezeSettings() {
            return this._settingsFrozen = !0, this._settings;
        }
        _delete() {
            return this._terminateTask || (this._terminateTask = this._terminate()), this._terminateTask;
        }
        /** Returns a JSON-serializable representation of this `Firestore` instance. */    toJSON() {
            return {
                app: this._app,
                databaseId: this._databaseId,
                settings: this._settings
            };
        }
        /**
         * Terminates all components used by this client. Subclasses can override
         * this method to clean up their own dependencies, but must also call this
         * method.
         *
         * Only ever called once.
         */    _terminate() {
            /**
     * Removes all components associated with the provided instance. Must be called
     * when the `Firestore` instance is terminated.
     */
            return function __PRIVATE_removeComponents(e) {
                const t = me.get(e);
                t && (__PRIVATE_logDebug("ComponentProvider", "Removing Datastore"), me.delete(e), 
                t.terminate());
            }(this), Promise.resolve();
        }
    }

    /**
     * Modify this instance to communicate with the Cloud Firestore emulator.
     *
     * Note: This must be called before this instance has been used to do any
     * operations.
     *
     * @param firestore - The `Firestore` instance to configure to connect to the
     * emulator.
     * @param host - the emulator host (ex: localhost).
     * @param port - the emulator port (ex: 9000).
     * @param options.mockUserToken - the mock auth token to use for unit testing
     * Security Rules.
     */ function connectFirestoreEmulator(e, t, n, r = {}) {
        var i;
        const s = (e = __PRIVATE_cast(e, Firestore$1))._getSettings(), o = `${t}:${n}`;
        if ("firestore.googleapis.com" !== s.host && s.host !== o && __PRIVATE_logWarn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."), 
        e._setSettings(Object.assign(Object.assign({}, s), {
            host: o,
            ssl: !1
        })), r.mockUserToken) {
            let t, n;
            if ("string" == typeof r.mockUserToken) t = r.mockUserToken, n = User.MOCK_USER; else {
                // Let createMockUserToken validate first (catches common mistakes like
                // invalid field "uid" and missing field "sub" / "user_id".)
                t = createMockUserToken(r.mockUserToken, null === (i = e._app) || void 0 === i ? void 0 : i.options.projectId);
                const s = r.mockUserToken.sub || r.mockUserToken.user_id;
                if (!s) throw new FirestoreError(D.INVALID_ARGUMENT, "mockUserToken must contain 'sub' or 'user_id' field!");
                n = new User(s);
            }
            e._authCredentials = new __PRIVATE_EmulatorAuthCredentialsProvider(new __PRIVATE_OAuthToken(t, n));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `Query` refers to a query which you can read or listen to. You can also
     * construct refined `Query` objects by adding filters and ordering.
     */ class Query {
        // This is the lite version of the Query class in the main SDK.
        /** @hideconstructor protected */
        constructor(e, 
        /**
         * If provided, the `FirestoreDataConverter` associated with this instance.
         */
        t, n) {
            this.converter = t, this._query = n, 
            /** The type of this Firestore reference. */
            this.type = "query", this.firestore = e;
        }
        withConverter(e) {
            return new Query(this.firestore, e, this._query);
        }
    }

    /**
     * A `DocumentReference` refers to a document location in a Firestore database
     * and can be used to write, read, or listen to the location. The document at
     * the referenced location may or may not exist.
     */ class DocumentReference {
        /** @hideconstructor */
        constructor(e, 
        /**
         * If provided, the `FirestoreDataConverter` associated with this instance.
         */
        t, n) {
            this.converter = t, this._key = n, 
            /** The type of this Firestore reference. */
            this.type = "document", this.firestore = e;
        }
        get _path() {
            return this._key.path;
        }
        /**
         * The document's identifier within its collection.
         */    get id() {
            return this._key.path.lastSegment();
        }
        /**
         * A string representing the path of the referenced document (relative
         * to the root of the database).
         */    get path() {
            return this._key.path.canonicalString();
        }
        /**
         * The collection this `DocumentReference` belongs to.
         */    get parent() {
            return new CollectionReference(this.firestore, this.converter, this._key.path.popLast());
        }
        withConverter(e) {
            return new DocumentReference(this.firestore, e, this._key);
        }
    }

    /**
     * A `CollectionReference` object can be used for adding documents, getting
     * document references, and querying for documents (using {@link (query:1)}).
     */ class CollectionReference extends Query {
        /** @hideconstructor */
        constructor(e, t, n) {
            super(e, t, __PRIVATE_newQueryForPath(n)), this._path = n, 
            /** The type of this Firestore reference. */
            this.type = "collection";
        }
        /** The collection's identifier. */    get id() {
            return this._query.path.lastSegment();
        }
        /**
         * A string representing the path of the referenced collection (relative
         * to the root of the database).
         */    get path() {
            return this._query.path.canonicalString();
        }
        /**
         * A reference to the containing `DocumentReference` if this is a
         * subcollection. If this isn't a subcollection, the reference is null.
         */    get parent() {
            const e = this._path.popLast();
            return e.isEmpty() ? null : new DocumentReference(this.firestore, 
            /* converter= */ null, new DocumentKey(e));
        }
        withConverter(e) {
            return new CollectionReference(this.firestore, e, this._path);
        }
    }

    function collection(e, t, ...n) {
        if (e = getModularInstance(e), __PRIVATE_validateNonEmptyArgument("collection", "path", t), e instanceof Firestore$1) {
            const r = ResourcePath.fromString(t, ...n);
            return __PRIVATE_validateCollectionPath(r), new CollectionReference(e, /* converter= */ null, r);
        }
        {
            if (!(e instanceof DocumentReference || e instanceof CollectionReference)) throw new FirestoreError(D.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
            const r = e._path.child(ResourcePath.fromString(t, ...n));
            return __PRIVATE_validateCollectionPath(r), new CollectionReference(e.firestore, 
            /* converter= */ null, r);
        }
    }

    function doc(e, t, ...n) {
        if (e = getModularInstance(e), 
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        1 === arguments.length && (t = __PRIVATE_AutoId.V()), __PRIVATE_validateNonEmptyArgument("doc", "path", t), 
        e instanceof Firestore$1) {
            const r = ResourcePath.fromString(t, ...n);
            return __PRIVATE_validateDocumentPath(r), new DocumentReference(e, 
            /* converter= */ null, new DocumentKey(r));
        }
        {
            if (!(e instanceof DocumentReference || e instanceof CollectionReference)) throw new FirestoreError(D.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
            const r = e._path.child(ResourcePath.fromString(t, ...n));
            return __PRIVATE_validateDocumentPath(r), new DocumentReference(e.firestore, e instanceof CollectionReference ? e.converter : null, new DocumentKey(r));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_AsyncQueueImpl {
        constructor() {
            // The last promise in the queue.
            this.Ya = Promise.resolve(), 
            // A list of retryable operations. Retryable operations are run in order and
            // retried with backoff.
            this.Za = [], 
            // Is this AsyncQueue being shut down? Once it is set to true, it will not
            // be changed again.
            this.Xa = !1, 
            // Operations scheduled to be queued in the future. Operations are
            // automatically removed after they are run or canceled.
            this.eu = [], 
            // visible for testing
            this.tu = null, 
            // Flag set while there's an outstanding AsyncQueue operation, used for
            // assertion sanity-checks.
            this.nu = !1, 
            // Enabled during shutdown on Safari to prevent future access to IndexedDB.
            this.ru = !1, 
            // List of TimerIds to fast-forward delays for.
            this.iu = [], 
            // Backoff timer used to schedule retries for retryable operations
            this.jo = new __PRIVATE_ExponentialBackoff(this, "async_queue_retry" /* TimerId.AsyncQueueRetry */), 
            // Visibility handler that triggers an immediate retry of all retryable
            // operations. Meant to speed up recovery when we regain file system access
            // after page comes into foreground.
            this.su = () => {
                const e = getDocument();
                e && __PRIVATE_logDebug("AsyncQueue", "Visibility state changed to " + e.visibilityState), 
                this.jo.Ko();
            };
            const e = getDocument();
            e && "function" == typeof e.addEventListener && e.addEventListener("visibilitychange", this.su);
        }
        get isShuttingDown() {
            return this.Xa;
        }
        /**
         * Adds a new operation to the queue without waiting for it to complete (i.e.
         * we ignore the Promise result).
         */    enqueueAndForget(e) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.enqueue(e);
        }
        enqueueAndForgetEvenWhileRestricted(e) {
            this.ou(), 
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._u(e);
        }
        enterRestrictedMode(e) {
            if (!this.Xa) {
                this.Xa = !0, this.ru = e || !1;
                const t = getDocument();
                t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.su);
            }
        }
        enqueue(e) {
            if (this.ou(), this.Xa) 
            // Return a Promise which never resolves.
            return new Promise((() => {}));
            // Create a deferred Promise that we can return to the callee. This
            // allows us to return a "hanging Promise" only to the callee and still
            // advance the queue even when the operation is not run.
                    const t = new __PRIVATE_Deferred;
            return this._u((() => this.Xa && this.ru ? Promise.resolve() : (e().then(t.resolve, t.reject), 
            t.promise))).then((() => t.promise));
        }
        enqueueRetryable(e) {
            this.enqueueAndForget((() => (this.Za.push(e), this.au())));
        }
        /**
         * Runs the next operation from the retryable queue. If the operation fails,
         * reschedules with backoff.
         */    async au() {
            if (0 !== this.Za.length) {
                try {
                    await this.Za[0](), this.Za.shift(), this.jo.reset();
                } catch (e) {
                    if (!__PRIVATE_isIndexedDbTransactionError(e)) throw e;
     // Failure will be handled by AsyncQueue
                                    __PRIVATE_logDebug("AsyncQueue", "Operation failed with retryable error: " + e);
                }
                this.Za.length > 0 && 
                // If there are additional operations, we re-schedule `retryNextOp()`.
                // This is necessary to run retryable operations that failed during
                // their initial attempt since we don't know whether they are already
                // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
                // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
                // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
                // call scheduled here.
                // Since `backoffAndRun()` cancels an existing backoff and schedules a
                // new backoff on every call, there is only ever a single additional
                // operation in the queue.
                this.jo.qo((() => this.au()));
            }
        }
        _u(e) {
            const t = this.Ya.then((() => (this.nu = !0, e().catch((e => {
                this.tu = e, this.nu = !1;
                const t = 
                /**
     * Chrome includes Error.message in Error.stack. Other browsers do not.
     * This returns expected output of message + stack when available.
     * @param error - Error or FirestoreError
     */
                function __PRIVATE_getMessageOrStack(e) {
                    let t = e.message || "";
                    e.stack && (t = e.stack.includes(e.message) ? e.stack : e.message + "\n" + e.stack);
                    return t;
                }
                /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ (e);
                // Re-throw the error so that this.tail becomes a rejected Promise and
                // all further attempts to chain (via .then) will just short-circuit
                // and return the rejected Promise.
                throw __PRIVATE_logError("INTERNAL UNHANDLED ERROR: ", t), e;
            })).then((e => (this.nu = !1, e))))));
            return this.Ya = t, t;
        }
        enqueueAfterDelay(e, t, n) {
            this.ou(), 
            // Fast-forward delays for timerIds that have been overriden.
            this.iu.indexOf(e) > -1 && (t = 0);
            const r = DelayedOperation.createAndSchedule(this, e, t, n, (e => this.uu(e)));
            return this.eu.push(r), r;
        }
        ou() {
            this.tu && fail();
        }
        verifyOperationInProgress() {}
        /**
         * Waits until all currently queued tasks are finished executing. Delayed
         * operations are not run.
         */    async cu() {
            // Operations in the queue prior to draining may have enqueued additional
            // operations. Keep draining the queue until the tail is no longer advanced,
            // which indicates that no more new operations were enqueued and that all
            // operations were executed.
            let e;
            do {
                e = this.Ya, await e;
            } while (e !== this.Ya);
        }
        /**
         * For Tests: Determine if a delayed operation with a particular TimerId
         * exists.
         */    lu(e) {
            for (const t of this.eu) if (t.timerId === e) return !0;
            return !1;
        }
        /**
         * For Tests: Runs some or all delayed operations early.
         *
         * @param lastTimerId - Delayed operations up to and including this TimerId
         * will be drained. Pass TimerId.All to run all delayed operations.
         * @returns a Promise that resolves once all operations have been run.
         */    hu(e) {
            // Note that draining may generate more delayed ops, so we do that first.
            return this.cu().then((() => {
                // Run ops in the same order they'd run if they ran naturally.
                this.eu.sort(((e, t) => e.targetTimeMs - t.targetTimeMs));
                for (const t of this.eu) if (t.skipDelay(), "all" /* TimerId.All */ !== e && t.timerId === e) break;
                return this.cu();
            }));
        }
        /**
         * For Tests: Skip all subsequent delays for a timer id.
         */    Pu(e) {
            this.iu.push(e);
        }
        /** Called once a DelayedOperation is run or canceled. */    uu(e) {
            // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
            const t = this.eu.indexOf(e);
            this.eu.splice(t, 1);
        }
    }

    /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
     */ class Firestore extends Firestore$1 {
        /** @hideconstructor */
        constructor(e, t, n, r) {
            super(e, t, n, r), 
            /**
             * Whether it's a {@link Firestore} or Firestore Lite instance.
             */
            this.type = "firestore", this._queue = function __PRIVATE_newAsyncQueue() {
                return new __PRIVATE_AsyncQueueImpl;
            }(), this._persistenceKey = (null == r ? void 0 : r.name) || "[DEFAULT]";
        }
        _terminate() {
            return this._firestoreClient || 
            // The client must be initialized to ensure that all subsequent API
            // usage throws an exception.
            __PRIVATE_configureFirestore(this), this._firestoreClient.terminate();
        }
    }

    function getFirestore(t, n) {
        const r = "object" == typeof t ? t : getApp(), i = "string" == typeof t ? t : n || "(default)", s = _getProvider(r, "firestore").getImmediate({
            identifier: i
        });
        if (!s._initialized) {
            const e = getDefaultEmulatorHostnameAndPort("firestore");
            e && connectFirestoreEmulator(s, ...e);
        }
        return s;
    }

    /**
     * @internal
     */ function ensureFirestoreConfigured(e) {
        return e._firestoreClient || __PRIVATE_configureFirestore(e), e._firestoreClient.verifyNotTerminated(), 
        e._firestoreClient;
    }

    function __PRIVATE_configureFirestore(e) {
        var t, n, r;
        const i = e._freezeSettings(), s = function __PRIVATE_makeDatabaseInfo(e, t, n, r) {
            return new DatabaseInfo(e, t, n, r.host, r.ssl, r.experimentalForceLongPolling, r.experimentalAutoDetectLongPolling, __PRIVATE_cloneLongPollingOptions(r.experimentalLongPollingOptions), r.useFetchStreams);
        }(e._databaseId, (null === (t = e._app) || void 0 === t ? void 0 : t.options.appId) || "", e._persistenceKey, i);
        e._firestoreClient = new FirestoreClient(e._authCredentials, e._appCheckCredentials, e._queue, s), 
        (null === (n = i.localCache) || void 0 === n ? void 0 : n._offlineComponentProvider) && (null === (r = i.localCache) || void 0 === r ? void 0 : r._onlineComponentProvider) && (e._firestoreClient._uninitializedComponentsProvider = {
            _offlineKind: i.localCache.kind,
            _offline: i.localCache._offlineComponentProvider,
            _online: i.localCache._onlineComponentProvider
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An immutable object representing an array of bytes.
     */ class Bytes {
        /** @hideconstructor */
        constructor(e) {
            this._byteString = e;
        }
        /**
         * Creates a new `Bytes` object from the given Base64 string, converting it to
         * bytes.
         *
         * @param base64 - The Base64 string used to create the `Bytes` object.
         */    static fromBase64String(e) {
            try {
                return new Bytes(ByteString.fromBase64String(e));
            } catch (e) {
                throw new FirestoreError(D.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + e);
            }
        }
        /**
         * Creates a new `Bytes` object from the given Uint8Array.
         *
         * @param array - The Uint8Array used to create the `Bytes` object.
         */    static fromUint8Array(e) {
            return new Bytes(ByteString.fromUint8Array(e));
        }
        /**
         * Returns the underlying bytes as a Base64-encoded string.
         *
         * @returns The Base64-encoded string created from the `Bytes` object.
         */    toBase64() {
            return this._byteString.toBase64();
        }
        /**
         * Returns the underlying bytes in a new `Uint8Array`.
         *
         * @returns The Uint8Array created from the `Bytes` object.
         */    toUint8Array() {
            return this._byteString.toUint8Array();
        }
        /**
         * Returns a string representation of the `Bytes` object.
         *
         * @returns A string representation of the `Bytes` object.
         */    toString() {
            return "Bytes(base64: " + this.toBase64() + ")";
        }
        /**
         * Returns true if this `Bytes` object is equal to the provided one.
         *
         * @param other - The `Bytes` object to compare against.
         * @returns true if this `Bytes` object is equal to the provided one.
         */    isEqual(e) {
            return this._byteString.isEqual(e._byteString);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `FieldPath` refers to a field in a document. The path may consist of a
     * single field name (referring to a top-level field in the document), or a
     * list of field names (referring to a nested field in the document).
     *
     * Create a `FieldPath` by providing field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     */ class FieldPath {
        /**
         * Creates a `FieldPath` from the provided field names. If more than one field
         * name is provided, the path will point to a nested field in a document.
         *
         * @param fieldNames - A list of field names.
         */
        constructor(...e) {
            for (let t = 0; t < e.length; ++t) if (0 === e[t].length) throw new FirestoreError(D.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
            this._internalPath = new FieldPath$1(e);
        }
        /**
         * Returns true if this `FieldPath` is equal to the provided one.
         *
         * @param other - The `FieldPath` to compare against.
         * @returns true if this `FieldPath` is equal to the provided one.
         */    isEqual(e) {
            return this._internalPath.isEqual(e._internalPath);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Sentinel values that can be used when writing document fields with `set()`
     * or `update()`.
     */ class FieldValue {
        /**
         * @param _methodName - The public API endpoint that returns this class.
         * @hideconstructor
         */
        constructor(e) {
            this._methodName = e;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An immutable object representing a geographic location in Firestore. The
     * location is represented as latitude/longitude pair.
     *
     * Latitude values are in the range of [-90, 90].
     * Longitude values are in the range of [-180, 180].
     */ class GeoPoint {
        /**
         * Creates a new immutable `GeoPoint` object with the provided latitude and
         * longitude values.
         * @param latitude - The latitude as number between -90 and 90.
         * @param longitude - The longitude as number between -180 and 180.
         */
        constructor(e, t) {
            if (!isFinite(e) || e < -90 || e > 90) throw new FirestoreError(D.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + e);
            if (!isFinite(t) || t < -180 || t > 180) throw new FirestoreError(D.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + t);
            this._lat = e, this._long = t;
        }
        /**
         * The latitude of this `GeoPoint` instance.
         */    get latitude() {
            return this._lat;
        }
        /**
         * The longitude of this `GeoPoint` instance.
         */    get longitude() {
            return this._long;
        }
        /**
         * Returns true if this `GeoPoint` is equal to the provided one.
         *
         * @param other - The `GeoPoint` to compare against.
         * @returns true if this `GeoPoint` is equal to the provided one.
         */    isEqual(e) {
            return this._lat === e._lat && this._long === e._long;
        }
        /** Returns a JSON-serializable representation of this GeoPoint. */    toJSON() {
            return {
                latitude: this._lat,
                longitude: this._long
            };
        }
        /**
         * Actually private to JS consumers of our API, so this function is prefixed
         * with an underscore.
         */    _compareTo(e) {
            return __PRIVATE_primitiveComparator(this._lat, e._lat) || __PRIVATE_primitiveComparator(this._long, e._long);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const ge = /^__.*__$/;

    /** The result of parsing document data (e.g. for a setData call). */ class ParsedSetData {
        constructor(e, t, n) {
            this.data = e, this.fieldMask = t, this.fieldTransforms = n;
        }
        toMutation(e, t) {
            return null !== this.fieldMask ? new __PRIVATE_PatchMutation(e, this.data, this.fieldMask, t, this.fieldTransforms) : new __PRIVATE_SetMutation(e, this.data, t, this.fieldTransforms);
        }
    }

    function __PRIVATE_isWrite(e) {
        switch (e) {
          case 0 /* UserDataSource.Set */ :
     // fall through
                  case 2 /* UserDataSource.MergeSet */ :
     // fall through
                  case 1 /* UserDataSource.Update */ :
            return !0;

          case 3 /* UserDataSource.Argument */ :
          case 4 /* UserDataSource.ArrayArgument */ :
            return !1;

          default:
            throw fail();
        }
    }

    /** A "context" object passed around while parsing user data. */ class __PRIVATE_ParseContextImpl {
        /**
         * Initializes a ParseContext with the given source and path.
         *
         * @param settings - The settings for the parser.
         * @param databaseId - The database ID of the Firestore instance.
         * @param serializer - The serializer to use to generate the Value proto.
         * @param ignoreUndefinedProperties - Whether to ignore undefined properties
         * rather than throw.
         * @param fieldTransforms - A mutable list of field transforms encountered
         * while parsing the data.
         * @param fieldMask - A mutable list of field paths encountered while parsing
         * the data.
         *
         * TODO(b/34871131): We don't support array paths right now, so path can be
         * null to indicate the context represents any location within an array (in
         * which case certain features will not work and errors will be somewhat
         * compromised).
         */
        constructor(e, t, n, r, i, s) {
            this.settings = e, this.databaseId = t, this.serializer = n, this.ignoreUndefinedProperties = r, 
            // Minor hack: If fieldTransforms is undefined, we assume this is an
            // external call and we need to validate the entire path.
            void 0 === i && this.Iu(), this.fieldTransforms = i || [], this.fieldMask = s || [];
        }
        get path() {
            return this.settings.path;
        }
        get Tu() {
            return this.settings.Tu;
        }
        /** Returns a new context with the specified settings overwritten. */    Eu(e) {
            return new __PRIVATE_ParseContextImpl(Object.assign(Object.assign({}, this.settings), e), this.databaseId, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.fieldMask);
        }
        du(e) {
            var t;
            const n = null === (t = this.path) || void 0 === t ? void 0 : t.child(e), r = this.Eu({
                path: n,
                Au: !1
            });
            return r.Ru(e), r;
        }
        Vu(e) {
            var t;
            const n = null === (t = this.path) || void 0 === t ? void 0 : t.child(e), r = this.Eu({
                path: n,
                Au: !1
            });
            return r.Iu(), r;
        }
        mu(e) {
            // TODO(b/34871131): We don't support array paths right now; so make path
            // undefined.
            return this.Eu({
                path: void 0,
                Au: !0
            });
        }
        fu(e) {
            return __PRIVATE_createError(e, this.settings.methodName, this.settings.gu || !1, this.path, this.settings.pu);
        }
        /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(e) {
            return void 0 !== this.fieldMask.find((t => e.isPrefixOf(t))) || void 0 !== this.fieldTransforms.find((t => e.isPrefixOf(t.field)));
        }
        Iu() {
            // TODO(b/34871131): Remove null check once we have proper paths for fields
            // within arrays.
            if (this.path) for (let e = 0; e < this.path.length; e++) this.Ru(this.path.get(e));
        }
        Ru(e) {
            if (0 === e.length) throw this.fu("Document fields must not be empty");
            if (__PRIVATE_isWrite(this.Tu) && ge.test(e)) throw this.fu('Document fields cannot begin and end with "__"');
        }
    }

    /**
     * Helper for parsing raw user input (provided via the API) into internal model
     * classes.
     */ class __PRIVATE_UserDataReader {
        constructor(e, t, n) {
            this.databaseId = e, this.ignoreUndefinedProperties = t, this.serializer = n || __PRIVATE_newSerializer(e);
        }
        /** Creates a new top-level parse context. */    yu(e, t, n, r = !1) {
            return new __PRIVATE_ParseContextImpl({
                Tu: e,
                methodName: t,
                pu: n,
                path: FieldPath$1.emptyPath(),
                Au: !1,
                gu: r
            }, this.databaseId, this.serializer, this.ignoreUndefinedProperties);
        }
    }

    function __PRIVATE_newUserDataReader(e) {
        const t = e._freezeSettings(), n = __PRIVATE_newSerializer(e._databaseId);
        return new __PRIVATE_UserDataReader(e._databaseId, !!t.ignoreUndefinedProperties, n);
    }

    /** Parse document data from a set() call. */ function __PRIVATE_parseSetData(e, t, n, r, i, s = {}) {
        const o = e.yu(s.merge || s.mergeFields ? 2 /* UserDataSource.MergeSet */ : 0 /* UserDataSource.Set */ , t, n, i);
        __PRIVATE_validatePlainObject("Data must be an object, but it was:", o, r);
        const _ = __PRIVATE_parseObject(r, o);
        let a, u;
        if (s.merge) a = new FieldMask(o.fieldMask), u = o.fieldTransforms; else if (s.mergeFields) {
            const e = [];
            for (const r of s.mergeFields) {
                const i = __PRIVATE_fieldPathFromArgument$1(t, r, n);
                if (!o.contains(i)) throw new FirestoreError(D.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
                __PRIVATE_fieldMaskContains(e, i) || e.push(i);
            }
            a = new FieldMask(e), u = o.fieldTransforms.filter((e => a.covers(e.field)));
        } else a = null, u = o.fieldTransforms;
        return new ParsedSetData(new ObjectValue(_), a, u);
    }

    /**
     * Parses user data to Protobuf Values.
     *
     * @param input - Data to be parsed.
     * @param context - A context object representing the current path being parsed,
     * the source of the data being parsed, etc.
     * @returns The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */ function __PRIVATE_parseData(e, t) {
        if (__PRIVATE_looksLikeJsonObject(
        // Unwrap the API type from the Compat SDK. This will return the API type
        // from firestore-exp.
        e = getModularInstance(e))) return __PRIVATE_validatePlainObject("Unsupported field value:", t, e), 
        __PRIVATE_parseObject(e, t);
        if (e instanceof FieldValue) 
        // FieldValues usually parse into transforms (except deleteField())
        // in which case we do not want to include this field in our parsed data
        // (as doing so will overwrite the field directly prior to the transform
        // trying to transform it). So we don't add this location to
        // context.fieldMask and we return null as our parsing result.
        /**
     * "Parses" the provided FieldValueImpl, adding any necessary transforms to
     * context.fieldTransforms.
     */
        return function __PRIVATE_parseSentinelFieldValue(e, t) {
            // Sentinels are only supported with writes, and not within arrays.
            if (!__PRIVATE_isWrite(t.Tu)) throw t.fu(`${e._methodName}() can only be used with update() and set()`);
            if (!t.path) throw t.fu(`${e._methodName}() is not currently supported inside arrays`);
            const n = e._toFieldTransform(t);
            n && t.fieldTransforms.push(n);
        }
        /**
     * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
     *
     * @returns The parsed value
     */ (e, t), null;
        if (void 0 === e && t.ignoreUndefinedProperties) 
        // If the input is undefined it can never participate in the fieldMask, so
        // don't handle this below. If `ignoreUndefinedProperties` is false,
        // `parseScalarValue` will reject an undefined value.
        return null;
        if (
        // If context.path is null we are inside an array and we don't support
        // field mask paths more granular than the top-level array.
        t.path && t.fieldMask.push(t.path), e instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            // In the case of IN queries, the parsed data is an array (representing
            // the set of values to be included for the IN query) that may directly
            // contain additional arrays (each representing an individual field
            // value), so we disable this validation.
            if (t.settings.Au && 4 /* UserDataSource.ArrayArgument */ !== t.Tu) throw t.fu("Nested arrays are not supported");
            return function __PRIVATE_parseArray(e, t) {
                const n = [];
                let r = 0;
                for (const i of e) {
                    let e = __PRIVATE_parseData(i, t.mu(r));
                    null == e && (
                    // Just include nulls in the array for fields being replaced with a
                    // sentinel.
                    e = {
                        nullValue: "NULL_VALUE"
                    }), n.push(e), r++;
                }
                return {
                    arrayValue: {
                        values: n
                    }
                };
            }(e, t);
        }
        return function __PRIVATE_parseScalarValue(e, t) {
            if (null === (e = getModularInstance(e))) return {
                nullValue: "NULL_VALUE"
            };
            if ("number" == typeof e) return toNumber(t.serializer, e);
            if ("boolean" == typeof e) return {
                booleanValue: e
            };
            if ("string" == typeof e) return {
                stringValue: e
            };
            if (e instanceof Date) {
                const n = Timestamp.fromDate(e);
                return {
                    timestampValue: toTimestamp(t.serializer, n)
                };
            }
            if (e instanceof Timestamp) {
                // Firestore backend truncates precision down to microseconds. To ensure
                // offline mode works the same with regards to truncation, perform the
                // truncation immediately without waiting for the backend to do that.
                const n = new Timestamp(e.seconds, 1e3 * Math.floor(e.nanoseconds / 1e3));
                return {
                    timestampValue: toTimestamp(t.serializer, n)
                };
            }
            if (e instanceof GeoPoint) return {
                geoPointValue: {
                    latitude: e.latitude,
                    longitude: e.longitude
                }
            };
            if (e instanceof Bytes) return {
                bytesValue: __PRIVATE_toBytes(t.serializer, e._byteString)
            };
            if (e instanceof DocumentReference) {
                const n = t.databaseId, r = e.firestore._databaseId;
                if (!r.isEqual(n)) throw t.fu(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);
                return {
                    referenceValue: __PRIVATE_toResourceName(e.firestore._databaseId || t.databaseId, e._key.path)
                };
            }
            throw t.fu(`Unsupported field value: ${__PRIVATE_valueDescription(e)}`);
        }
        /**
     * Checks whether an object looks like a JSON object that should be converted
     * into a struct. Normal class/prototype instances are considered to look like
     * JSON objects since they should be converted to a struct value. Arrays, Dates,
     * GeoPoints, etc. are not considered to look like JSON objects since they map
     * to specific FieldValue types other than ObjectValue.
     */ (e, t);
    }

    function __PRIVATE_parseObject(e, t) {
        const n = {};
        return isEmpty(e) ? 
        // If we encounter an empty object, we explicitly add it to the update
        // mask to ensure that the server creates a map entry.
        t.path && t.path.length > 0 && t.fieldMask.push(t.path) : forEach(e, ((e, r) => {
            const i = __PRIVATE_parseData(r, t.du(e));
            null != i && (n[e] = i);
        })), {
            mapValue: {
                fields: n
            }
        };
    }

    function __PRIVATE_looksLikeJsonObject(e) {
        return !("object" != typeof e || null === e || e instanceof Array || e instanceof Date || e instanceof Timestamp || e instanceof GeoPoint || e instanceof Bytes || e instanceof DocumentReference || e instanceof FieldValue);
    }

    function __PRIVATE_validatePlainObject(e, t, n) {
        if (!__PRIVATE_looksLikeJsonObject(n) || !function __PRIVATE_isPlainObject(e) {
            return "object" == typeof e && null !== e && (Object.getPrototypeOf(e) === Object.prototype || null === Object.getPrototypeOf(e));
        }(n)) {
            const r = __PRIVATE_valueDescription(n);
            throw "an object" === r ? t.fu(e + " a custom object") : t.fu(e + " " + r);
        }
    }

    /**
     * Helper that calls fromDotSeparatedString() but wraps any error thrown.
     */ function __PRIVATE_fieldPathFromArgument$1(e, t, n) {
        if ((
        // If required, replace the FieldPath Compat class with with the firestore-exp
        // FieldPath.
        t = getModularInstance(t)) instanceof FieldPath) return t._internalPath;
        if ("string" == typeof t) return __PRIVATE_fieldPathFromDotSeparatedString(e, t);
        throw __PRIVATE_createError("Field path arguments must be of type string or ", e, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }

    /**
     * Matches any characters in a field path string that are reserved.
     */ const pe = new RegExp("[~\\*/\\[\\]]");

    /**
     * Wraps fromDotSeparatedString with an error message about the method that
     * was thrown.
     * @param methodName - The publicly visible method name
     * @param path - The dot-separated string form of a field path which will be
     * split on dots.
     * @param targetDoc - The document against which the field path will be
     * evaluated.
     */ function __PRIVATE_fieldPathFromDotSeparatedString(e, t, n) {
        if (t.search(pe) >= 0) throw __PRIVATE_createError(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`, e, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
        try {
            return new FieldPath(...t.split("."))._internalPath;
        } catch (r) {
            throw __PRIVATE_createError(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`, e, 
            /* hasConverter= */ !1, 
            /* path= */ void 0, n);
        }
    }

    function __PRIVATE_createError(e, t, n, r, i) {
        const s = r && !r.isEmpty(), o = void 0 !== i;
        let _ = `Function ${t}() called with invalid data`;
        n && (_ += " (via `toFirestore()`)"), _ += ". ";
        let a = "";
        return (s || o) && (a += " (found", s && (a += ` in field ${r}`), o && (a += ` in document ${i}`), 
        a += ")"), new FirestoreError(D.INVALID_ARGUMENT, _ + e + a);
    }

    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */ function __PRIVATE_fieldMaskContains(e, t) {
        return e.some((e => e.isEqual(t)));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Converts custom model object of type T into `DocumentData` by applying the
     * converter if it exists.
     *
     * This function is used when converting user objects to `DocumentData`
     * because we want to provide the user with a more specific error message if
     * their `set()` or fails due to invalid data originating from a `toFirestore()`
     * call.
     */ function __PRIVATE_applyFirestoreDataConverter(e, t, n) {
        let r;
        // Cast to `any` in order to satisfy the union type constraint on
        // toFirestore().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return r = e ? n && (n.merge || n.mergeFields) ? e.toFirestore(t, n) : e.toFirestore(t) : t, 
        r;
    }

    /**
     * Add a new document to specified `CollectionReference` with the given data,
     * assigning it a document ID automatically.
     *
     * @param reference - A reference to the collection to add this document to.
     * @param data - An Object containing the data for the new document.
     * @returns A `Promise` resolved with a `DocumentReference` pointing to the
     * newly created document after it has been written to the backend (Note that it
     * won't resolve while you're offline).
     */ function addDoc(e, t) {
        const n = __PRIVATE_cast(e.firestore, Firestore), r = doc(e), i = __PRIVATE_applyFirestoreDataConverter(e.converter, t);
        return executeWrite(n, [ __PRIVATE_parseSetData(__PRIVATE_newUserDataReader(e.firestore), "addDoc", r._key, i, null !== e.converter, {}).toMutation(r._key, Precondition.exists(!1)) ]).then((() => r));
    }

    /**
     * Locally writes `mutations` on the async queue.
     * @internal
     */ function executeWrite(e, t) {
        return function __PRIVATE_firestoreClientWrite(e, t) {
            const n = new __PRIVATE_Deferred;
            return e.asyncQueue.enqueueAndForget((async () => __PRIVATE_syncEngineWrite(await __PRIVATE_getSyncEngine(e), t, n))), 
            n.promise;
        }(ensureFirestoreConfigured(e), t);
    }

    /**
     * Cloud Firestore
     *
     * @packageDocumentation
     */ !function __PRIVATE_registerFirestore(e, t = !0) {
        !function __PRIVATE_setSDKVersion(e) {
            S = e;
        }(SDK_VERSION), _registerComponent(new Component("firestore", ((e, {instanceIdentifier: n, options: r}) => {
            const i = e.getProvider("app").getImmediate(), s = new Firestore(new __PRIVATE_FirebaseAuthCredentialsProvider(e.getProvider("auth-internal")), new __PRIVATE_FirebaseAppCheckTokenProvider(e.getProvider("app-check-internal")), function __PRIVATE_databaseIdFromApp(e, t) {
                if (!Object.prototype.hasOwnProperty.apply(e.options, [ "projectId" ])) throw new FirestoreError(D.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
                return new DatabaseId(e.options.projectId, t);
            }(i, n), i);
            return r = Object.assign({
                useFetchStreams: t
            }, r), s._setSettings(r), s;
        }), "PUBLIC").setMultipleInstances(!0)), registerVersion(w, "4.3.0", e), 
        // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
        registerVersion(w, "4.3.0", "esm2017");
    }();

    // Import required classes from Firebase

    // Your Firebase config object

    const firebaseConfig = {
      apiKey: "AIzaSyB7oEQf-NoeZqsAdTLQAgWo84m3I1KnAZI",
      authDomain: "esplanade-46a07.firebaseapp.com",
      projectId: "esplanade-46a07",
      storageBucket: "esplanade-46a07.appspot.com",
      messagingSenderId: "803109975262",
      appId: "1:803109975262:web:f39f8e10520a6b6eb23e4f",
      measurementId: "1:803109975262:web:f39f8e10520a6b6eb23e4f",
    };

    // Initialize Firebase
    const app$1 = initializeApp(firebaseConfig);

    // Initialize Firestore
    const db = getFirestore(app$1);

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let header;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let form;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let input2;
    	let t5;
    	let button;
    	let t7;
    	let div2;
    	let video;
    	let source;
    	let source_src_value;
    	let t8;
    	let t9;
    	let div3;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t10;
    	let a2;
    	let img2;
    	let img2_src_value;
    	let t11;
    	let div4;
    	let t12;
    	let footer;
    	let div9;
    	let div5;
    	let img3;
    	let img3_src_value;
    	let t13;
    	let div8;
    	let div6;
    	let strong0;
    	let t15;
    	let p0;
    	let t17;
    	let div7;
    	let strong1;
    	let t19;
    	let p1;
    	let t21;
    	let div10;
    	let t22;
    	let div13;
    	let div11;
    	let t24;
    	let div12;
    	let a3;
    	let t26;
    	let a4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "Step into the future\n  with Esplanade AI. Revolutionise\n  your business operations and\n  experience unparalleled efficiency.";
    			t2 = space();
    			div1 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			input2 = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			t7 = space();
    			div2 = element("div");
    			video = element("video");
    			source = element("source");
    			t8 = text("\n    Your browser does not support the video tag.");
    			t9 = space();
    			div3 = element("div");
    			a1 = element("a");
    			img1 = element("img");
    			t10 = space();
    			a2 = element("a");
    			img2 = element("img");
    			t11 = space();
    			div4 = element("div");
    			t12 = space();
    			footer = element("footer");
    			div9 = element("div");
    			div5 = element("div");
    			img3 = element("img");
    			t13 = space();
    			div8 = element("div");
    			div6 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "Address";
    			t15 = space();
    			p0 = element("p");
    			p0.textContent = "Sydney, AUS";
    			t17 = space();
    			div7 = element("div");
    			strong1 = element("strong");
    			strong1.textContent = "Contact";
    			t19 = space();
    			p1 = element("p");
    			p1.textContent = "digital@esplanade.ai";
    			t21 = space();
    			div10 = element("div");
    			t22 = space();
    			div13 = element("div");
    			div11 = element("div");
    			div11.textContent = "© 2023 Esplanade.ai. All rights reserved.";
    			t24 = space();
    			div12 = element("div");
    			a3 = element("a");
    			a3.textContent = "T&Cs";
    			t26 = space();
    			a4 = element("a");
    			a4.textContent = "Privacy Policy";
    			if (!src_url_equal(img0.src, img0_src_value = "/espWhite.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Your Logo");
    			attr_dev(img0, "class", "logo svelte-nx1oav");
    			add_location(img0, file, 62, 4, 2587);
    			attr_dev(a0, "href", "index");
    			attr_dev(a0, "class", "svelte-nx1oav");
    			add_location(a0, file, 61, 2, 2566);
    			attr_dev(header, "class", "svelte-nx1oav");
    			add_location(header, file, 60, 0, 2555);
    			attr_dev(div0, "class", "translucent-section centered-content large-text svelte-nx1oav");
    			add_location(div0, file, 66, 0, 2662);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "fullname");
    			attr_dev(input0, "placeholder", "Full Name");
    			input0.required = true;
    			attr_dev(input0, "class", "svelte-nx1oav");
    			add_location(input0, file, 75, 4, 2940);
    			attr_dev(input1, "type", "tel");
    			attr_dev(input1, "name", "number");
    			attr_dev(input1, "placeholder", "Phone Number");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-nx1oav");
    			add_location(input1, file, 76, 4, 3015);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "name", "email");
    			attr_dev(input2, "placeholder", "Email Address");
    			input2.required = true;
    			attr_dev(input2, "class", "svelte-nx1oav");
    			add_location(input2, file, 77, 4, 3090);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-nx1oav");
    			add_location(button, file, 78, 4, 3167);
    			attr_dev(form, "class", "svelte-nx1oav");
    			add_location(form, file, 74, 2, 2904);
    			attr_dev(div1, "class", "contact-form svelte-nx1oav");
    			add_location(div1, file, 73, 0, 2875);
    			if (!src_url_equal(source.src, source_src_value = "/siteBGcont2.mp4")) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "video/mp4");
    			attr_dev(source, "class", "svelte-nx1oav");
    			add_location(source, file, 84, 4, 3317);
    			attr_dev(video, "id", "bgVideo");
    			video.autoplay = true;
    			video.muted = true;
    			video.loop = true;
    			video.playsInline = true;
    			attr_dev(video, "poster", "tealPurple169-2.png");
    			attr_dev(video, "class", "svelte-nx1oav");
    			add_location(video, file, 83, 2, 3231);
    			attr_dev(div2, "class", "svelte-nx1oav");
    			add_location(div2, file, 82, 0, 3223);
    			if (!src_url_equal(img1.src, img1_src_value = "/Instagram.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Instagram");
    			attr_dev(img1, "class", "svelte-nx1oav");
    			add_location(img1, file, 91, 4, 3520);
    			attr_dev(a1, "href", "https://www.instagram.com/esplanade.ai/");
    			attr_dev(a1, "class", "svelte-nx1oav");
    			add_location(a1, file, 90, 2, 3465);
    			if (!src_url_equal(img2.src, img2_src_value = "/linkedin.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Linkedin");
    			attr_dev(img2, "class", "svelte-nx1oav");
    			add_location(img2, file, 94, 4, 3635);
    			attr_dev(a2, "href", "https://www.linkedin.com/company/esplanade-ai");
    			attr_dev(a2, "class", "svelte-nx1oav");
    			add_location(a2, file, 93, 2, 3574);
    			attr_dev(div3, "class", "social-icons svelte-nx1oav");
    			add_location(div3, file, 89, 0, 3436);
    			attr_dev(div4, "id", "bpw-layout");
    			attr_dev(div4, "class", "svelte-nx1oav");
    			add_location(div4, file, 98, 0, 3693);
    			if (!src_url_equal(img3.src, img3_src_value = "justLogoWhite.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Esplanade Logo");
    			attr_dev(img3, "class", "svelte-nx1oav");
    			add_location(img3, file, 103, 6, 3794);
    			attr_dev(div5, "class", "footer-logo svelte-nx1oav");
    			add_location(div5, file, 102, 4, 3762);
    			attr_dev(strong0, "class", "svelte-nx1oav");
    			add_location(strong0, file, 107, 8, 3912);
    			attr_dev(p0, "class", "svelte-nx1oav");
    			add_location(p0, file, 108, 8, 3945);
    			attr_dev(div6, "class", "svelte-nx1oav");
    			add_location(div6, file, 106, 6, 3898);
    			attr_dev(strong1, "class", "svelte-nx1oav");
    			add_location(strong1, file, 111, 8, 3997);
    			attr_dev(p1, "class", "svelte-nx1oav");
    			add_location(p1, file, 112, 8, 4030);
    			attr_dev(div7, "class", "svelte-nx1oav");
    			add_location(div7, file, 110, 6, 3983);
    			attr_dev(div8, "class", "address-contact svelte-nx1oav");
    			add_location(div8, file, 105, 4, 3862);
    			attr_dev(div9, "class", "footer-row svelte-nx1oav");
    			add_location(div9, file, 101, 2, 3733);
    			attr_dev(div10, "class", "footer-divider svelte-nx1oav");
    			add_location(div10, file, 117, 2, 4094);
    			attr_dev(div11, "class", "svelte-nx1oav");
    			add_location(div11, file, 120, 4, 4161);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "svelte-nx1oav");
    			add_location(a3, file, 122, 6, 4235);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "svelte-nx1oav");
    			add_location(a4, file, 123, 6, 4262);
    			attr_dev(div12, "class", "svelte-nx1oav");
    			add_location(div12, file, 121, 4, 4223);
    			attr_dev(div13, "class", "footer-row svelte-nx1oav");
    			add_location(div13, file, 119, 2, 4132);
    			attr_dev(footer, "class", "svelte-nx1oav");
    			add_location(footer, file, 100, 0, 3722);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, a0);
    			append_dev(a0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, form);
    			append_dev(form, input0);
    			append_dev(form, t3);
    			append_dev(form, input1);
    			append_dev(form, t4);
    			append_dev(form, input2);
    			append_dev(form, t5);
    			append_dev(form, button);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video);
    			append_dev(video, source);
    			append_dev(video, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, a1);
    			append_dev(a1, img1);
    			append_dev(div3, t10);
    			append_dev(div3, a2);
    			append_dev(a2, img2);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div4, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div9);
    			append_dev(div9, div5);
    			append_dev(div5, img3);
    			append_dev(div9, t13);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, strong0);
    			append_dev(div6, t15);
    			append_dev(div6, p0);
    			append_dev(div8, t17);
    			append_dev(div8, div7);
    			append_dev(div7, strong1);
    			append_dev(div7, t19);
    			append_dev(div7, p1);
    			append_dev(footer, t21);
    			append_dev(footer, div10);
    			append_dev(footer, t22);
    			append_dev(footer, div13);
    			append_dev(div13, div11);
    			append_dev(div13, t24);
    			append_dev(div13, div12);
    			append_dev(div12, a3);
    			append_dev(div12, t26);
    			append_dev(div12, a4);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*animateText*/ ctx[1].call(null, div0)),
    					listen_dev(form, "submit", /*handleSubmit*/ ctx[0], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let fullname = '';
    	let number = '';
    	let email = '';

    	function handleSubmit(event) {
    		return __awaiter(this, void 0, void 0, function* () {
    			console.log("submit");
    			event.preventDefault();

    			const data = {
    				fullname: event.target.fullname.value,
    				number: event.target.number.value,
    				email: event.target.email.value
    			};

    			console.log("data", data);

    			try {
    				console.log("try");
    				const docRef = yield addDoc(collection(db, 'contacts'), data);
    				console.log("Document written with ID: ", docRef.id);
    			} catch(error) {
    				console.error("Error adding document: ", error);
    			}
    		});
    	}

    	function animateText(element) {
    		const text = element.innerText.trim().split(' ');
    		const wordsPerLine = Math.ceil(text.length / 4);
    		const formattedText = [];

    		text.forEach((word, index) => {
    			// Set initial opacity to 0 for each word
    			formattedText.push(`<span style="opacity: 0">${word}</span>`);

    			if ((index + 1) % wordsPerLine === 0 && index !== text.length - 1) {
    				formattedText.push('<br>');
    			}
    		});

    		element.innerHTML = formattedText.join(' ');
    		const childrenArray = [...element.children];
    		animate(childrenArray, { opacity: [0, 1] }, { duration: 3, delay: stagger(0.3) });

    		setTimeout(
    			() => {
    				childrenArray.forEach(child => {
    					const childText = child.textContent.trim();

    					if (childText === "unparalleled" || childText.includes("efficiency")) {
    						animate(child, { color: '#d28cd1' }, { duration: 1 });
    					}
    				});
    			},
    			(text.length * 0.3 + 3) * 650
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		animate,
    		stagger,
    		db,
    		collection,
    		addDoc,
    		fullname,
    		number,
    		email,
    		handleSubmit,
    		animateText
    	});

    	$$self.$inject_state = $$props => {
    		if ('__awaiter' in $$props) __awaiter = $$props.__awaiter;
    		if ('fullname' in $$props) fullname = $$props.fullname;
    		if ('number' in $$props) number = $$props.number;
    		if ('email' in $$props) email = $$props.email;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [handleSubmit, animateText];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: "world",
      },
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

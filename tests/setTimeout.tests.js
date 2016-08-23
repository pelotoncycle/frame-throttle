const jsdom = require('jsdom').jsdom;
const sinon = require('sinon');
const test = require('./helpers').test;

const FRAME_TIME = 1000/60;
const frameTick = () => {
    clock.tick(FRAME_TIME);
};

const setup = () => {
    const document = jsdom('<html><body></body></html>');
    global.window = document.defaultView;
    global.clock = sinon.useFakeTimers();
    sinon.stub(window, 'setTimeout', global.setTimeout);
    global.setTimeout = window.setTimeout;
};
const teardown = () => {
    global.window.setTimeout.restore();
    global.clock.restore();
};

test('calls setTimeout once for multiple event occurrences', (t) => {
    t.plan(3);
    setup();

    const throttle = require('../throttle');
    const throttledListener = throttle(() => {});
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(window.setTimeout.callCount, 0,
        'sanity check - setTimeout not called before event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(window.setTimeout.callCount, 1,
        'calls setTimeout upon first event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(window.setTimeout.callCount, 1,
        'does not call setTimeout again upon second event dispatch');
}, teardown);

test('waits 1/60th of a second to call the callback', (t) => {
    setup();
    t.plan(4);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(listener.callCount, 1,
        'calls listener upon first event dispatch');

    listener.reset();
    window.dispatchEvent(new window.Event(event));
    clock.tick(FRAME_TIME - 1);
    window.dispatchEvent(new window.Event(event));

    t.equal(listener.callCount, 0,
        'does not call the listener again before 1/60th of a second');

    clock.tick(1);

    t.equal(listener.callCount, 0,
        'events fired prior to 1/60th sec do not set callbacks for after 1/60th sec');
}, teardown);

test('calls the listener multiple times for multiple event/frame cycles', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));
    frameTick();

    t.equals(listener.callCount, 1,
        'listener is called during first event/frame cycle');

    window.dispatchEvent(new window.Event(event));
    frameTick();

    t.equals(listener.callCount, 2,
        'listener is called during second event/frame cycle');
}, teardown);

test('calls the listener once per event dispatch', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));
    frameTick();

    t.equal(listener.callCount, 1,
        'listener is called during first event/frame cycle');

    frameTick();

    t.equal(listener.callCount, 1,
        'listener is not called during second frame without event');
}, teardown);

test('no longer calls listener after removeEventListener', (t) => {
    setup();
    t.plan(2);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    window.dispatchEvent(new window.Event(event));
    frameTick();

    t.equal(listener.callCount, 1,
        'sanity check - listener called during first event/frame cycle');

    window.removeEventListener(event, throttledListener);

    window.dispatchEvent(new window.Event(event));
    frameTick();

    t.equal(listener.callCount, 1,
        'listener is not called during second cycle after throttled listener is removed');
}, teardown);

test('passes the event object to the original listener', (t) => {
    setup();
    t.plan(2);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';
    const eventObject = new window.Event(event);

    window.addEventListener(event, throttledListener);

    window.dispatchEvent(eventObject);
    frameTick();

    t.equal(listener.callCount, 1,
        'sanity check - listener called during first event/frame cycle');

    t.equal(listener.getCall(0).args[0], eventObject,
        'listener called with the provided event object');
}, teardown);
// @ts-nocheck
/* ► CryptoCoders Digitex Bracket Order Script ◄ */
/* Description:
    This script automatically places a stop loss and take-profit conditional order for you when you place an order on the Digitex ladder.
    Update your settings below and copy the whole script into the developer tools console (F12 on Chrome/Brave)

*/

const FUTURES   = 1; // DO NOT EDIT THIS LINE
const SPOT      = 2; // DO NOT EDIT THIS LINE
const STOP_ONLY = 3; // DO NOT EDIT THIS LINE
const BOTH      = 4; // DO NOT EDIT THIS LINE
const MARKET    = 5; // DO NOT EDIT THIS LINE
const LIMIT     = 6; // DO NOT EDIT THIS LINE

/* ----------------------------------------- SETTINGS ----------------------------------------- */

var SETTINGS = {
    api_key: '',
    tick_size: 1,
    tp_distance: 3,
    sl_distance: 2,
    stopIsTrailing: true,
    debug: true,
    trigger: SPOT, // Futures price will be supported in the future
    Symbol: 'BTCUSD1-PERP', // DO NOT EDIT THIS - It's auto updated!
    bracket_type: BOTH, // or STOP_ONLY; BOTH (default) places a stop loss AND take profit order for you
    orderType: MARKET,
    quickOrders: [
        { S: 3, t: 5, o: 5 },
        { S: 5, t: 7, o: 5 },
        { S: 5, t: 10, o: 6 }
    ],
    enabled: true, // toggle true/false to disable the plugin
    useNotifs: true,
    useSounds: true
};
chrome.storage.sync.get({
    digitexAPI: '',
  }, function(items) {
    SETTINGS.api_key = items.digitexAPI;
});
/* --------------------------------------- End SETTINGS --------------------------------------- */

/* DO NOT MODIFY BELOW THIS LINE */

var settingsBtn, listener, contracts, orders = [], spotPx = null, exchangePx = null, currentPresetBtn, curQty, apiCalls = 0, positions;
const knob = '<img class="cursor-pointer knob" src="https://lambot.app/css/Drag-icon.png" alt="Move Order" style="position:relative; left: -10px;">';
function save_options() {
    chrome.storage.sync.set({
      digitexMod: SETTINGS,
    }, function() {
        console.log('Bracket Mod Settings Saved');
    });
  }
  function get_options(cb) {
    chrome.storage.sync.get({
        digitexMod: '',
    }, function(items) {
      cb(items.digitexMod);
    });
  }
  function restore_options() {
    chrome.storage.sync.get({
        digitexMod: '',
    }, function(items) {
      document.getElementById('digitexapi').value = items.digitexMod;
    });
  }
  document.addEventListener('DOMContentLoaded', restore_options);

function parseMsg(msg) {
    
    if (msg.id == 1) { // Authorization response
        if (msg.status == 'ok') { styledConsole('Successfully Authorized', 'success'); styledConsole('Complete! Start trading with confidence!', 'success'); } else { styledConsole('Authorization: Unsuccessful -'+msg.msg, 'error'); }
    }
    if (msg.ch == 'index') {
        let b = msg.data.spotPx, a = $('td.active.ladder-grid__price').html() * 1, c = spotPx != b || exchangePx != a;
        if (a != 'NaN') {
            exchangePx = a;
        } spotPx = b;
        if (c) { positions.forEach(p=>p.testTrailingDistance()); }
    }
    if (!SETTINGS.enabled) { return; }
    if (msg.ch == 'tradingStatus') { styledConsole('Trading Status:' + msg.data.available, 'success'); }
    
    else if (msg.ch == 'orderFilled') { // Order Fill
        if (msg.data.positionContracts == 0) {
            console.log('Position Disolved');
            ws._send(JSON.stringify({
                "id": 6,
                "method": "cancelCondOrder",
                "params": {
                    "symbol": SETTINGS.Symbol,
                    "allForTrader": true
                }
            }));
            positions.clear(); // Clear out positions array
            return;
        }
        if ((contracts < 0 && msg.data.orderSide == 'BUY') || (contracts > 0 && msg.data.orderSide == 'SELL')) { return; } // Getting out of trade
        console.log(`${ msg.data.orderSide } ${ msg.data.origQty - msg.data.qty } contracts.`); 

        if (positions.getWithID(msg.data.origClOrdId)) {
            let pos = positions.getWithID(msg.data.origClOrdId);
            positions.update({ id: msg.data.origClOrdId }, 'contracts', pos.contracts + (msg.data.origQty - msg.data.qty));
            pos.cancelConditionals();
            pos.sendConditionals();
        } else {
            const order = orders.filter((x) => { return x.id == msg.data.origClOrdId; })[0];
            var p = new Position(order);
            positions.add(p);
            p.sendConditionals();
        }
    }
    else if (msg.ch == 'orderStatus') { // When an order is placed
        
        if (msg.data.orderStatus == 'ACCEPTED') {
            if ((contracts < 0 && msg.data.orderSide == 'BUY') || (contracts > 0 && msg.data.orderSide == 'BUY')) { return; } // Getting out of trade

            if (msg.data.orderType == 'MARKET') {
                var position = new Position({
                    id: msg.data.origClOrdId,
                    entry: Math.ceil(msg.data.markPx),
                    contracts: msg.data.qty,
                    TPOrdType: SETTINGS.orderType,
                    side: msg.data.orderSide.toLowerCase(),
                    TP: msg.data.orderSide == 'SELL' ? Math.ceil(msg.data.markPx) - (SETTINGS.tick_size * SETTINGS.tp_distance) : Math.ceil(msg.data.markPx) + (SETTINGS.tick_size * SETTINGS.tp_distance),
                    SL: msg.data.orderSide == 'SELL' ? Math.ceil(msg.data.markPx) + (SETTINGS.tick_size * SETTINGS.sl_distance) : Math.ceil(msg.data.markPx) - (SETTINGS.tick_size * SETTINGS.sl_distance),
                    stopIsTrailing: SETTINGS.stopIsTrailing,
                });
                positions.add(position);
                position.sendConditionals();
            }
            else {
                var order = new Order({
                    id: msg.data.origClOrdId,
                    entry: msg.data.px,
                    contracts: msg.data.qty,
                    stopIsTrailing: SETTINGS.stopIsTrailing,
                    TPOrdType: SETTINGS.orderType,
                    side: msg.data.orderSide.toLowerCase(),
                    TP: msg.data.orderSide == 'SELL' ? msg.data.px - (SETTINGS.tick_size * SETTINGS.tp_distance) : msg.data.px + (SETTINGS.tick_size * SETTINGS.tp_distance),
                    SL: msg.data.orderSide == 'SELL' ? msg.data.px + (SETTINGS.tick_size * SETTINGS.sl_distance) : msg.data.px - (SETTINGS.tick_size * SETTINGS.sl_distance)
                });
                orders.push(order);
            }
        }
    } else if (msg.ch == 'condOrderStatus') { // When an conditional order is placed
        
        if (msg.data.status == 'TRIGGERED' && msg.data.symbol == SETTINGS.Symbol) {
            msg.data.conditionalOrders.forEach((condOrder) => {
                const ordID = condOrder.oldActionId;
                console.log(ordID.substring(0, 2) == 'SL' ? 'Stop Loss Hit' : 'Take Profit Hit', ordID);
                var position = positions.getWithConditional(ordID);
                position[0].cancelConditionals();
                if (ordID.substring(0, 2) == 'SL') {
                    if ((condOrder.pxValue > position[0].entry && position[0].side == 'buy') || (condOrder.pxValue < position[0].entry && position[0].side == 'sell')) { playChaching(); } else { playAlarm(); }
                    notify('Stop Loss Activated', 'Entry: ' + position[0].entry + '\nExit: ' + condOrder.pxValue + '\nSide: ' + position[0].side);
                } else if (ordID.substring(0, 2) == 'TP') { playChaching(); notify('Take Profit Activated', 'Entry: ' + position[0].entry + '\nExit: ' + condOrder.pxValue + '\nSide: ' + position[0].side); }
            });
        } else if (msg.data.status == 'REJECTED' && msg.data.symbol == SETTINGS.Symbol) {
            msg.data.conditionalOrders.forEach((c) => {
                console.log('Conditional Rejected: '+c.actionId);
            });
        } else if (msg.data.status == 'ACCEPTED' && msg.data.symbol == SETTINGS.Symbol) {
            msg.data.conditionalOrders.forEach((c) => {
                console.log('Conditional Accepted: '+c.actionId);
            });
        } else { console.warn(msg.data.status); }
    }
    else if (msg.ch == 'orderCancelled') { // When an order is cancelled, remove from orders
        msg.data.orders.forEach((order) => {
            orders = orders.filter((x) => {
                return x.id != order.origClOrdId;
            });
        });
    }
    else if (msg.ch == 'error') { 
        console.error(msg);
    }
}

class OrderType {
    constructor(opts) {
        this.id = opts.id || uuid();
        this._contracts = opts.contracts;
        this.side = opts.side;
        this.entry = opts.entry;
        this._TP = opts.TP || null;
        this._SL = opts.SL || null;
        this.TPOrdType = opts.TPOrdType || MARKET;
        this.active = true;
        this.stopIsTrailing = opts.stopIsTrailing || false;
        this.created = new Date();
        if (this.entry != 0) { console.log(`New ${ this.constructor.name }:\nEntry: $${ this.entry }\nQty: ${ this.contracts }`); }
    }
    get contracts() { return this._contracts; }
    get TP() { return this._TP; }
    get SL() { return this._SL; }
    set contracts(amount){ this._contracts = amount * 1; };
    set TP(price) {
        if ((this.side == 'long' && !price < exchangePx) || (this.side == 'short' && !price > exchangePx)) { console.error(`An attempt change the order Take Profit with ID:${ this.id } to $${ price }. This would result in an immidiate position liquidation.`); return; }
        this._TP = price;
    }
    set SL(price) {
        if ((this.side == 'long' && !price < exchangePx) || (this.side == 'short' && !price > exchangePx)) { console.error(`An attempt change the order Take Profit with ID:${ this.id } to $${ price }. This would result in an immidiate position liquidation.`); return; }
        this._SL = price;
    }
    get pxType() { return 'SPOT_PRICE'; } // For now
    get TPCondition() {return this.side == 'buy' ? 'GREATER_EQUAL' : 'LESS_EQUAL';}
    get SLCondition() { if (this.side == 'buy') { return 'LESS_EQUAL'; } else { return 'GREATER_EQUAL'; }}
    get conditionalSide() {
        if (this.side == 'buy') { return 'SELL'; } else { return 'BUY'; }
    }
    get level() { return this.entry * 1; }
    get ladderRow() {
        return $('table.ladder-grid__table tbody').find(`td:contains(${ this.level })`);
    }
    get TPladderRow() {
        if (!this.TP) { return null;}
        return $($('table.ladder-grid__table tbody').find(`td:contains(${ this.TP })`)[0]).parent();
    }
    get SLladderRow() {
        if (!this.SL) { return null;}
        return $($('table.ladder-grid__table tbody').find(`td:contains(${ this.SL })`)[0]).parent();
    }
    set TP(price) {
        if ((this.side == 'long' && !price < exchangePx) || (this.side == 'short' && !price > exchangePx)) { console.error(`An attempt change the order Take Profit with ID:${ this.id } to $${ price }. This would result in an immidiate position liquidation.`); return; }
        this._TP = price;
        this.save();
    }
}
class Order extends OrderType {
    constructor(opts) {
        super(opts);
        this._isConditional = opts.isConditional || false;
    }
    set isConditional(bool) {
        if (typeof bool != 'boolean') { console.error('TypeError: Attempt to change order to a conditional failed. Order.isConditional = boolean Must be a boolean.'); return; }
        this._isConditional = bool; 
    }
    get isConditional() { return this._isConditional; }
    existsInDB() {
        return DB.getTable('Orders').filter((order) => {
            return order.id == this.id
        }).length;
    }

    serialize() { // Can be passed into positions creation Eg. new Position( JSON.parse( Order.toJSON() ) ) also this is the format is saved to DB
        return JSON.stringify({ id: this.id, entry: this.entry, contracts: this.contracts, side: this.side, isConditional: this.isConditional, TP: this.TP, SL: this.SL });
    }
}
class Position extends OrderType {
    constructor(opts) {
        super(opts);
        this.conditionalOrders = [];

        // Gonna need a trailing stop. Attach to the event...
        if (this.stopIsTrailing) {
            window.addEventListener('priceupdate', this.testTrailingDistance.bind(this) , false);
        }
    }
    get stopHit() { return !this.active; }
    get contracts() { return this._contracts * 1; }
    set contracts(amount) {
        this._contracts = amount * 1;
        if (this.contracts == 0) {
            console.log('Position with ID: ' + this.id + ' - Disolved');
            this.remove();
            return;
        }
        if (this.conditionalOrders.length) { this.plotOnLadder(); }
    }
    testTrailingDistance() {
        if (!this.active || !this.stopIsTrailing) { return; }
        if (this.side == 'buy' && exchangePx - this.SL > SETTINGS.sl_distance) {
            this.updateTrailingStopLoss(exchangePx - SETTINGS.sl_distance);
        } else if (this.side == 'sell' && this.SL - exchangePx > SETTINGS.sl_distance) {
            this.updateTrailingStopLoss(exchangePx + SETTINGS.sl_distance);
        }
    }
    remove() {
        this.cancelConditionals();
        positions.remove(this.id);
    }
    updateTrailingStopLoss(price) {
        console.log(`Update Stop from ${this.SL} to ${price}!`);
        this.SL = price;
        var stopID = this.conditionalOrders.filter((order) => { return order.substring(0, 2) == 'SL'; })[0];
        ws._send(JSON.stringify({
            "id": 6,
            "method": "cancelCondOrder",
            "params": {
                "symbol": SETTINGS.Symbol,
                "actionId": stopID,
                "allForTrader": false
            }
        }));
        setTimeout(() => {
            ws._send(JSON.stringify({
                "id": 4, // 4 is placing a stop
                "method": "placeCondOrder",
                "params": {
                    "symbol": SETTINGS.Symbol,
                    "actionId": stopID,
                    "pxType": this.pxType,
                    "condition": this.SLCondition,
                    "pxValue": this.SL,
                    "clOrdId": this.id,
                    "ordType": "MARKET",
                    "timeInForce": "GTC",
                    "side": this.conditionalSide,
                    "px": this.SL,
                    "qty": this.contracts,
                    "mayIncrPosition": false
                }
            }));
        }, 30);
    }
    sendConditionals(both = true) { 
        var i = this.TP;
        if (this.TPOrdType == LIMIT && this.side == 'sell') {
            i = this.TP + (SETTINGS.tick_size * 2);
        } else if (this.TPOrdType == LIMIT && this.side == 'buy') {
            i = this.TP - (SETTINGS.tick_size * 2);
        }
            const TP_PARAMS = { //Send TP
                "id": 4, // 5 is placing a TP
                "method": "placeCondOrder",
                "params": {
                    "symbol": SETTINGS.Symbol,
                    "actionId": 'TP_' + uuid(),
                    "pxType": this.pxType,
                    "condition": this.TPCondition,
                    "pxValue": i,
                    "clOrdId": this.id,
                    "ordType": (this.TPOrdType == MARKET ? 'MARKET' : 'LIMIT'),
                    "timeInForce": "GTC",
                    "side": this.conditionalSide,
                    "px": this.TP,
                    "qty": this.contracts,
                    "mayIncrPosition": false
                }
            }
            const SL_PARAMS = {
                "id": 4, // 4 is placing a stop
                "method": "placeCondOrder",
                "params": {
                    "symbol": SETTINGS.Symbol,
                    "actionId": 'SL_'+uuid(),
                    "pxType": this.pxType,
                    "condition": this.SLCondition,
                    "pxValue": this.SL,
                    "clOrdId": this.id,
                    "ordType": "MARKET",
                    "timeInForce": "GTC",
                    "side": this.conditionalSide,
                    "px": this.SL,
                    "qty": this.contracts,
                    "mayIncrPosition": false
                }
        }
        if (SETTINGS.bracket_type == BOTH) {
            this.conditionalOrders.push(TP_PARAMS.params.actionId);
            this.conditionalOrders.push(SL_PARAMS.params.actionId);
            ws._send(JSON.stringify(SL_PARAMS));
            ws._send(JSON.stringify(TP_PARAMS));
        } else { // Just send SL
            this.conditionalOrders.push(SL_PARAMS.params.actionId);
            ws._send(JSON.stringify(SL_PARAMS));
        }
    }
    cancelConditionals(all = false) {
        // TODO When you right-click the icon, cancel that conditional
        this.conditionalOrders.forEach((orderID) => {
            ws._send(JSON.stringify({
                "id": 6,
                "method": "cancelCondOrder",
                "params": {
                    "symbol": SETTINGS.Symbol,
                    "actionId": orderID,
                    "allForTrader": (all?true:false)
                }
            }));
            window.removeEventListener('priceupdate', this.testTrailingDistance, false);
        });
        this.removePlot();
    }
    plotOnLadder() {
        let col = (this.TP > this.entry ? 1 : 5); 
        this.SLladderRow.find('td.ladder-grid__price').css('color', 'rgb(228,88,93)');
        this.TPladderRow.find('td.ladder-grid__price').css('color', 'rgb(37,208,131)');
        this.SLladderRow.find(`:nth-child(${col})`).css({
                backgroundImage: 'url("https://lambot.app/css/SL.png")',
                backgroundRepeat: 'no-repeat'
            }).addClass('icon');
        if (SETTINGS.bracket_type == BOTH) {
            this.TPladderRow.find(`:nth-child(${ col })`).css({
                backgroundImage: 'url("https://lambot.app/css/MB.png")',
                backgroundRepeat: 'no-repeat'
            }).addClass('icon');
        }
    }
    removePlot() {
        this.SLladderRow.find('td.ladder-grid__price').css('color', 'rgb(220,220,220)');
        this.TPladderRow.find('td.ladder-grid__price').css('color', 'rgb(220,220,220)');
    }
}
class PositionArray {
    constructor() { this.clear(); }
    add(e) { if (e instanceof Position) { console.log('Adding Position with ID: '+e.id); this.a.push(e); } }
    remove(id) { let o = this.length; this.a = this.a.filter((p) => { return p.id != id; }); if (o > this.length) { console.log('Removing Position with ID: '+id); return true; } else { return false; } }
    forEach(cb) { this.a.forEach((p) => { cb(p);}); }
    getWithID(id) { let a = this.a.filter((p) => { return p.id != id; }); if (a.length) { return a[0]; } else { return null; } }
    getWithEntryPrice(price) { let a = this.a.filter((p) => { return p.entry != id.entry; }); if (a.length) { return a[0]; } else { return null; } }
    replace(p) { let find = this.a.filter((p1) => { return p1.id == p.id; }); if (find.length) { this.a.filter((p1) => { return p1.id != p.id; }); this.add(p); console.log('Replacing Position with ID: '+p.id); } else { this.add(p);} }
    update(p, key, value) { let pos = this.getWithID(p.id); if (pos) { pos[key] = value; this.replace(pos); console.log('Updating Position with ID: '+p.id+'\n'+key,value); } }
    filter(cb) { return this.a.filter((p) => { cb(p); }); }
    getWithConditional(id) { return this.a.filter((p) => { return p.conditionalOrders.filter((co) => { return co.substring(0, id.length) == id }).length; }); }
    clear() { this.a = []; console.log('Clearing Out Position Array'); }
    get length() { return this.a.length; }

}
class db {
    constructor(dbName = null) {
        try {
            localStorage.test = 't';
            localStorage.setItem('test', 't')
            localStorage.removeItem('test');
            this.enabled = 1;
        } catch (e) {
            console.warn('Cannot use storage for some unknown reason. This could be caused by settings within your browser.');
            this.enabled = 0;
        }
        if (dbName) { this.pre = dbName; } else { this.pre = dbName; }
    }
    set prefix(prefix) { if (this.enabled) { this.pre = prefix; } }
    get prefix() { return this.pre + '_'; }
    setSettings() {
        if (!this.enabled) { return; }
        localStorage.setItem(this.prefix + 'Settings', JSON.stringify(SETTINGS));
    }
    getSettings() {
        if (!this.enabled) { return; }
        return JSON.parse(localStorage.getItem(this.prefix + 'Settings'));
    }
    InsertTable(table, value) {
        var _table = this.getTable(table);
        _table.push({ id: _table.length, value: value });
        localStorage.setItem(this.prefix + table, JSON.stringify(_table));
    }
    generateID(table) {
        return this.getTable(table).length;
    }
    truncate() {
        console.log('Truncating Database: ' + this.pre);
        var items = Object.keys(localStorage).filter((x) => { return x.includes(this.prefix) });
        items.forEach((item) => { localStorage.removeItem(item); });
    }
    update(table, id, value) {
        var i = 0;
        var _table = this.getTable(table).forEach((x) => {
            if (x.id == id) { x.value = value; }
        });
        localStorage.setItem(this.prefix + table, JSON.stringify(_table));
        return _table;
    }
    removeItem(table, item) { if (this.enabled) { localStorage.removeItem(this.prefix + table + '_' + item); return 1; } }
    CreateTable(table) {
        if (!this.enabled) { return; }
        if (localStorage.getItem(this.prefix + table)) { return false; } else {
            localStorage.setItem(this.prefix + table, JSON.stringify([])); return true;
        }
    }
    GetByID(table, id) {
        return this.getTable(table).filter((x) => { return x.id == id; })[0];
    }
    getTable(tableName) {
        if (!this.enabled) { return; }
        var table = localStorage.getItem(this.prefix + tableName) || null;
        if (!table) { this.CreateTable(tableName); return []; }
        else { return JSON.parse(table); }
    }
    dropTable(table) {
        if (this.enabled) {
            console.groupCollapsed('Dropping Table:', table);
            let items = Object.keys(localStorage).filter((item) => {
                return item.includes(this.prefix + table);
            });
            var iCount = 0;
            items.forEach((item,i) => {
                console.warn('Deleting: ',item);
                localStorage.removeItem(item);
                iCount = i;
            });
            console.groupEnd();
            return iCount;
        }
        return -1;
    }
}
positions = new PositionArray()
const DB = new db('BracketMod'); // Start database

function styledConsole(msg, style) {
    var styles = {
        main: [
            'background: linear-gradient(#D33106, #571402)'
            , 'border: 1px solid #3E0E02'
            , 'color: white'
            , 'width: 100%'
            , 'display: block'
            , 'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)'
            , 'box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset, 0 5px 3px -5px rgba(0, 0, 0, 0.5), 0 -13px 5px -10px rgba(255, 255, 255, 0.4) inset'
            , 'line-height: 40px'
            , 'text-align: center'
            , 'font-weight: bold'
            , 'border-radius: 5px'
        ].join(';'),
        success: [
            'background: rgb(20, 31, 26)'
            , 'color: rgb(37, 208, 131)'
        ].join(';'),
        error: [
            'background: rgb(33, 23, 23)'
            , 'color: rgb(228, 88, 93)'
        ].join(';'),
        warning: [
             'color: #dede7d'
        ].join(';'),
    }
    
    console.log('%c '+msg, styles[style]);
}
function uuid() { return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); }
function setup() {
    console.clear();
    var styles = [
        'background: linear-gradient(#D33106, #571402)'
        , 'border: 1px solid #3E0E02'
        , 'color: white'
        , 'width: 100%'
        , 'display: block'
        , 'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)'
        , 'box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset, 0 5px 3px -5px rgba(0, 0, 0, 0.5), 0 -13px 5px -10px rgba(255, 255, 255, 0.4) inset'
        , 'line-height: 40px'
        , 'text-align: center'
        , 'font-weight: bold'
        , 'border-radius: 5px'
    ].join(';');
    
    console.log('%c CryptoCoders Digitex Bracket Mod ', styles);
    console.log('Installed v. 0.9.1');
    styledConsole('Please wait, Running setup...', 'warning');
    ws = new WebSocket("wss://ws.mapi.digitexfutures.com");
    ws._send = function (d) {
        apiCalls++; ws.send(d);
        try { console.log(JSON.parse(d)); } catch (e) { console.log(d); }
    }
    ws.onopen = function () {
        styledConsole('Authorizing to your Digitex account...', 'warning');
        get_options((options) => {
            ws._send(JSON.stringify({
                "id": 1,
                "method": "auth",
                "params": {
                    "type": "token",
                    "value": options.api_key
                }
            }));
            ws._send(JSON.stringify({
                "id": 7,
                "method": "subscribe",
                "params": [
                    `${SETTINGS.Symbol}@index`
                ]
            }));
        });
    }
    ws.onmessage = function (evt) {
        var msg = evt.data;
        if (msg == 'ping') { ws._send('pong'); } else {
            parseMsg(JSON.parse(msg));
        }
    }
    ws.onclose = function() {
        setTimeout(() => {
            ws = new WebSocket("wss://ws.mapi.digitexfutures.com");
        },5000);
        console.warn("Warning! Websocket Closed! Attepmting to reconnect to Digitex...");
    }
}
setInterval(() => {
    try { exchangePx = $('td.active.ladder-grid__price').html() * 1; contracts = $('.position').html().replaceAll('<!---->','').trim()*1; } catch (e) { } //Set the Futures price
    //Determine the contract from the URL
    var url = window.location.href;
    curQty = localStorage.quantity;
    // Set the tick size
    if (url.includes('BTCUSD1')) { SETTINGS.tick_size = 1; SETTINGS.Symbol = 'BTCUSD1-PERP'; }
    else if (url.includes('BTCUSD')) { SETTINGS.tick_size = 5; SETTINGS.Symbol = 'BTCUSD-PERP'; }
}, 50);
if (DB.getSettings()) {
    SETTINGS = DB.getSettings();
}
function playChaching() {
    
    if (!SETTINGS.useSounds) { return; }
    $('#chaching')[0].play();
}
function playAlarm() {
    if (!SETTINGS.useSounds) { return; }
    var a = $('#alarm')[0];
    a.play();
    setTimeout(() => { a.pause(); }, 2000);
}
setInterval(() => {
    apiCalls=0
    $('.icon').css({backgroundImage: 'none'});
    positions.forEach((p) => {
        p.removePlot();
        p.plotOnLadder();
    });
}, 1000);
var notifs = false;
function notify(title, body){
    if (!notifs) { return; }
    return new Notification(title, {body: body});
}
// Check for notification permissions and request them if they arent granted.
if (!("Notification" in window)) {
    notifs = false;
}
else if (Notification.permission === "granted") {
    notifs = true
}
else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
        if (permission === "granted") { notifs = true; }
    });
}
$(document).on('keydown', (function(e) {
    if (e.altKey && e.which == 40) {
        console.log('Market Short Order for '+localStorage.quantity);
        ws._send(JSON.stringify({
            "id":3,
            "method":"placeOrder",
            "params":{
                "symbol":SETTINGS.Symbol,
                "clOrdId":uuid(),
                "ordType":"MARKET",
                "timeInForce":"IOC",
                "side":"SELL",
                "px":0,
                "qty":localStorage.quantity*1
            }
        }));
    } else if (e.altKey && e.which == 38) {
        console.log('Market Long Order for '+localStorage.quantity);
        ws._send(JSON.stringify({
            "id":3,
            "method":"placeOrder",
            "params":{
                "symbol":SETTINGS.Symbol,
                "clOrdId":uuid(),
                "ordType":"MARKET",
                "timeInForce":"IOC",
                "side":"BUY",
                "px":0,
                "qty":localStorage.quantity*1
            }
        }));
      }
}));
// TODO Add ability to add a market entry. In version > 1
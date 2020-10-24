// @ts-nocheck

var pageListener = setInterval(() => {
    try {
        if ($('.position').length) {
            document.dispatchEvent(new CustomEvent('PageFullyLoaded'));
            clearInterval(pageListener);
        }
    } catch (e) {

    }
}, 50);

document.addEventListener('PageFullyLoaded', InjectUI);


function InjectUI() {
    settingsBtn = $('.ladder-grid__controls-setting');
    console.log('Page Loaded');
    if (curQty != localStorage.quantity) {
        $('.quickSelect').each(function () {
            let a = $(this).html().replace('L', '').split('/'); let s = a[0];
            $('#' + $(this).attr('id') + 'h').text(((((localStorage.quantity * 0.1) * s) / ($($('.text-with-dgtx')[0]).html().replace(',', '') * 1)) * 100).toFixed(3) + '%');
        });
    }
    window.onresize = function () {
        if ($('.quickSelect').length < 3) { AddUI(); }

    }
    $('body').prepend('<audio id="alarm"><source src="https://lambot.app/css/alarm.wav" type="audio/wav">Your browser does not support the audio element.</audio>');
    $('body').prepend('<audio id="chaching"><source src="https://lambot.app/css/chaching.wav" type="audio/wav">Your browser does not support the audio element.</audio>');
    
    AddUI();
    
    // Add menu to echange menu

    settingsBtn.on('click', function () {
        setTimeout(() => {                
            //var selected2 = SETTINGS.trigger === SPOT ? ['selected', ''] : ['', 'selected'];
            var selected = SETTINGS.bracket_type === BOTH ? ['selected', ''] : ['', 'selected'];

            $('.modal-body').append('<h4>Bracket Order Settings</h4>');
            const settingDiv = $('.modal-body').append('<div class="row col-12"></div>');
            settingDiv.append(`<div class="form-group"><label class="form-label" for="orderType">Bracket Type</label><select class="form-control" id="orderType"><option value="3" ${selected[1]}>Just Stop Loss</options><option value="4"${selected[0]}>Place Both Brackets (TP & SL)</options></select></div>`);
            settingDiv.append(` <div class="row col-12">
                <div class="col-6">Sounds <input type="checkbox" id="sounds" ${(SETTINGS.useSounds==true?'checked':'')}/></div>
                <div class="col-6">Notifications <input type="checkbox" id="notifs" ${(SETTINGS.useNotifs==true?'checked':'')}/></div>
            </div><br/>`);
            settingDiv.append(`
                <h5>Bracket Presets</h5>
                <div class="row col-12">
                    <div class="col-5" style="text-align: center;">Stop Loss</div>
                    <div class="col-5"style="text-align: center;">Take Profit</div>
                    <div class="col-2"style="text-align: right;">Limit TP</div>
                </div>
                <div class="row col-12">
                    <div class="col-5"><input class="form-control" type="number" data-preset="0S" placeholder="Stop Loss" value="${SETTINGS.quickOrders[0].S}"/></div>
                    <div class="col-5"><input class="form-control" type="number" data-preset="0t" placeholder="Take Profit" value="${SETTINGS.quickOrders[0].t}"/></div>
                    <div class="col-2"><input type="checkbox" data-preset="0o" ${(SETTINGS.quickOrders[0].o==LIMIT?'checked':'')}/></div>
                </div>`);
                settingDiv.append(`
                <div class="row col-12">
                    <div class="col-5"><input class="form-control" type="number" data-preset="1S" placeholder="Stop Loss" value="${SETTINGS.quickOrders[1].S}"/></div>
                    <div class="col-5"><input class="form-control" type="number" data-preset="1t" placeholder="Take Profit" value="${SETTINGS.quickOrders[1].t}"/></div>
                    <div class="col-2"><input type="checkbox" data-preset="1o" ${(SETTINGS.quickOrders[1].o==LIMIT?'checked':'')}/></div>
                </div>`);
                settingDiv.append(`
                <div class="row col-12">
                    <div class="col-5"><input class="form-control" type="number" data-preset="2S" placeholder="Stop Loss" value="${SETTINGS.quickOrders[2].S}"/></div>
                    <div class="col-5"><input class="form-control" type="number" data-preset="2t" placeholder="Take Profit" value="${SETTINGS.quickOrders[2].t}"/></div>
                    <div class="col-2"><input type="checkbox" data-preset="2o" ${(SETTINGS.quickOrders[2].o==LIMIT?'checked':'')}/></div>
                </div>`);
            $('#sounds').on('change', function () {
                if ($(this).prop('checked')) { SETTINGS.useSounds = true; } else { SETTINGS.useSounds = false; }
            });
            $('#notifs').on('change', function () {
                if ($(this).prop('checked')) { SETTINGS.useNotifs = true; } else { SETTINGS.useNotifs = false; }
            });
            $("input[data-preset]").on('change', function () {
                let i = $(this).data('preset')[0]*1;
                let v = $(this).data('preset')[1];
                if (v == 'o') {
                    if ($(this).prop('checked')) { SETTINGS.quickOrders[i].o = LIMIT; }
                    else { SETTINGS.quickOrders[i].o = MARKET; }
                }
                else { SETTINGS.quickOrders[i][v] = $(this).val() * 1; }
                DB.setSettings();
                $(`#q${ i }`).html(`${ SETTINGS.quickOrders[i].S }/${ SETTINGS.quickOrders[i].t }${ (SETTINGS.quickOrders[i].o == LIMIT ? 'L' : '') }`).css({ backgroundColor: "rgb(26,26,26)", color: 'rgb(149,149,149)' }).removeClass('BM-Active');
            })
            // @ts-ignore
            $('#StopDist').on('change', function () { SETTINGS.sl_distance = $(this).val()*1; DB.setSettings(); });
                
            // @ts-ignore
            $('#TPDist').on('change', function () { SETTINGS.tp_distance = $(this).val()*1; DB.setSettings(); });
            // @ts-ignore
            $('#orderTrigger').on('change', function () { if ($(this).val() == 'Spot') { SETTINGS.trigger = SPOT; } else { SETTINGS.trigger = FUTURES; } DB.setSettings(); });
            $('#orderType').on('change', function () { if ($(this).val() == BOTH) { SETTINGS.bracket_type = BOTH; } else { SETTINGS.bracket_type = STOP_ONLY; } DB.setSettings(); });
        }, 100);
    });
    $('.text_myorders').trigger('click'); $('.navbar-nav').append('<li class="nav-item"><a href="https://lambot.app" class="nav-link">Lambot?</a></li>'); // Add a backlink to Lambots website.
    
    DB.CreateTable('Orders');
    if (!DB.CreateTable('Positions')) {
        // Table exists
    }
    if (DB.getSettings()) {
        SETTINGS = DB.getSettings();
    } else {
        DB.setSettings();
    }
    setup();
}

// Every 2 seconds, Create ghosts - This is on a loop because if the ladder moves, it breaks the ghosts ability to highlight

setInterval(() => {
    $('table.ladder-grid__table tbody').find('td:not(.cursor-default):not(.text-upnl)').off('mouseover');
    addGhosts();
}, 2000)
function addGhosts() {
    $('table.ladder-grid__table tbody').find('td:not(.cursor-default):not(.text-upnl)').on('mouseover', function (e) {
        const priceLevel = ($(this).is(':nth-child(2)') ? $(this).next().html() : $(this).prev().html());
        const priceElement = ($(this).is(':nth-child(2)') ? $(this).next() : $(this).prev());
        //console.log(`Settings: SL: ${ SETTINGS.sl_distance }; TP: ${ SETTINGS.tp_distance }, Bracket Type: ${ (SETTINGS.bracket_type == BOTH?'Both':'Stop Only') }`);
        if ($(this).is(':nth-child(2)') && priceLevel <= exchangePx) {
            priceElement.prop("style", "color: #afaf54;");
            if (SETTINGS.bracket_type == BOTH) {
                const TPElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) + (SETTINGS.tp_distance * SETTINGS.tick_size) })`);
                const SLElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) - (SETTINGS.sl_distance * SETTINGS.tick_size) })`);
                TPElem.addClass('temp').css({"color":"rgb(37, 208, 131)","background": "linear-gradient(to bottom, rgba(255,0,0,1) 1%, rgba(255,255,255,0) 100%);" });
                SLElem.addClass('temp').prop("style", "color: rgb(228, 88, 93);");
            } else {
                const SLElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) - (SETTINGS.sl_distance * SETTINGS.tick_size) })`);
                SLElem.addClass('temp').prop("style", "color: rgb(228, 88, 93);");
            }
        }
        else if ($(this).is(':nth-child(4)') && priceLevel >= exchangePx) {
            priceElement.prop("style", "color: #afaf54;");
            if (SETTINGS.bracket_type == BOTH) {
                const TPElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) - (SETTINGS.tp_distance * SETTINGS.tick_size) })`);
                const SLElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) + (SETTINGS.sl_distance * SETTINGS.tick_size) })`);
                TPElem.addClass('temp').prop("style", "color: rgb(37, 208, 131);");
                SLElem.addClass('temp').prop("style", "color: rgb(228, 88, 93);");
            } else {
                const SLElem = $('table.ladder-grid__table tbody').find(`td:contains(${ parseInt(priceLevel) + (SETTINGS.sl_distance * SETTINGS.tick_size) })`);
                SLElem.addClass('temp').prop("style", "color: rgb(228, 88, 93);");
            }
        }
    }).on('mouseout', function () {
        const priceElement = ($(this).is(':nth-child(2)') ? $(this).next() : $(this).prev());
        priceElement.prop("style", "");
        $('.temp').prop("style", "").removeClass('temp');
    });
}
function AddUI() {
    $($('tbody')[1]).find('td').on('click', function () {
        $('.quickSelect').each(function () {
            let a = $(this).html().replace('L','').split('/');
            let s = a[0], t = a[1];
            $('#'+$(this).attr('id') + 'h').text(((((localStorage.quantity * 0.1) * s)/($($('.text-with-dgtx')[0]).html().replace(',','')*1))*100).toFixed(3)+'%');
        });
    });
    $($('.ladder-grid__controls-table')[1]).after(
        '<p style="text-align: center;margin:auto; border" 2px solid #131313">Bracket Quick Select</p>' +
        `<button class="quickSelect" id="q0" style="width: 60px;height: 30px; background-color: rgb(26,26,26); color: rgb(149,149,149); border: 1px solid #131313;">${ SETTINGS.quickOrders[0].S }/${ SETTINGS.quickOrders[0].t }${ SETTINGS.quickOrders[0].o == LIMIT ? 'L' : '' }</button>` +
        `<button class="quickSelect" id="q1" style="width: 61px;height: 30px; background-color: rgb(26,26,26); color: rgb(149,149,149); border: 1px solid #131313;">${ SETTINGS.quickOrders[1].S }/${ SETTINGS.quickOrders[1].t }${ SETTINGS.quickOrders[1].o == LIMIT ? 'L' : '' }</button>` +
        `<button class="quickSelect" id="q2" style="width: 61px;height: 30px; background-color: rgb(26,26,26); color: rgb(149,149,149); border: 1px solid #131313;">${ SETTINGS.quickOrders[2].S }/${ SETTINGS.quickOrders[2].t }${ SETTINGS.quickOrders[2].o == LIMIT ? 'L' : '' }</button>` +
        `<button id="q0h" style="width: 60px;height: 15px; font-size: 9px; background-color: rgb(26,26,26); color: rgb(149,149,149);">1</button>` +
        `<button id="q1h" style="width: 60px;height: 15px; font-size: 9px; background-color: rgb(26,26,26); color: rgb(149,149,149);">1</button>` +
        `<button id="q2h" style="width: 60px;height: 15px; font-size: 9px; background-color: rgb(26,26,26); color: rgb(149,149,149);">1</button>`);
    $('.quickSelect').each(function () {
        let a = $(this).html().replace('L','').split('/');
        let s = a[0], t = a[1];
        if (SETTINGS.enabled && SETTINGS.sl_distance == s && SETTINGS.tp_distance == t) {
            $(this).css({
                backgroundColor: 'rgba(56,177,220, 0.1)',
                color: 'rgb(56,177,220)'
            }).addClass('BM-Active');
        }
        $('#'+$(this).attr('id') + 'h').text(((((localStorage.quantity * 0.1) * s)/($($('.text-with-dgtx')[0]).html().replace(',','')*1))*100).toFixed(3)+'%');
    });
    $('.quickSelect').on('click', function () {
        if ($(this).hasClass('BM-Active')) {
            SETTINGS.enabled = false;
            DB.setSettings();
            $(this).css({
                backgroundColor: "rgb(26,26,26)",
                color: 'rgb(149,149,149)'
            }).removeClass('BM-Active');
        }
        else {
            console.log(`Brackets changed to SL: ${$(this).html().split('/')[0] * 1} ticks; TP: ${$(this).html().split('/')[1].replace('L', '') * 1} ticks with a ${($(this).html().includes('L') ? 'limit' : 'market')} TP.`)
            SETTINGS.enabled = true;
            SETTINGS.orderType = ($(this).html().includes('L') ? LIMIT : MARKET);
            SETTINGS.sl_distance = $(this).html().split('/')[0] * 1;
            SETTINGS.tp_distance = $(this).html().split('/')[1].replace('L', '') * 1;
            DB.setSettings();
            $('.BM-Active').css({
                backgroundColor: "rgb(26,26,26)",
                color: 'rgb(149,149,149)'
            }).removeClass('BM-Active');
            $(this).css({
                backgroundColor: 'rgba(56,177,220, 0.1)',
                color: 'rgb(56,177,220)'
            }).addClass('BM-Active');
        }
        save_options();
    });
}
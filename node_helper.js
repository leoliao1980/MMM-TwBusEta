const request = require('request');
const axios = require('axios');
const jsSHA = require('jssha');
var NodeHelper = require("node_helper");


const getAuthorizationHeader = function() {
    var AppID = '303107a2014d4fb1b6eb8a01306d3ea4';
    var AppKey = '38SirQ54STAARFAf951GZPWeGv8';

    var GMTString = new Date().toGMTString();
    var ShaObj = new jsSHA('SHA-1', 'TEXT');
    ShaObj.setHMACKey(AppKey, 'TEXT');
    ShaObj.update('x-date: ' + GMTString);
    var HMAC = ShaObj.getHMAC('B64');
    var Authorization = 'hmac username=\"' + AppID + '\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"' + HMAC + '\"';

    return { 'Authorization': Authorization, 'X-Date': GMTString};
}


module.exports = NodeHelper.create({
    start() {
        console.log('Starting module helper:' +this.name);
        this.config = null
        this.pooler = []
        this.doneFirstPooling = false
    },

    stop(){
        console.log('Stopping module helper: ' +this.name);
    },

    socketNotificationReceived: function(noti, payload) {
        if (noti == "INIT") {
            this.config = payload
            console.log("[TWBUSETA] Initialized.")
        }
        if (noti == "START") {
            if (this.pooler.length == 0) {
                this.prepareScan()
            }
            this.startPooling()
        }
    },
    startPooling: function() {
        // Since December 2018, Alphavantage changed API quota limit.(500 per day)
        // So, fixed interval is used. for the first cycle, 15sec is used.
        // After first cycle, 3min is used for interval to match 500 quota limits.
        // So, one cycle would be 3min * symbol length;
        var interval = 0
        if (this.config.premiumAccount) {
          interval = this.config.poolInterval
        } else {
          interval = (this.doneFirstPooling) ? 180000 : 15000
        }

        if (this.pooler.length > 0) {
          var symbol = this.pooler.shift()
          this.callAPI(this.config, symbol, (noti, payload)=>{
            this.sendSocketNotification(noti, payload)
          })
        } else {
          this.doneFirstPooling = true
          this.prepareScan()
        }

        var timer = setTimeout(()=>{
          this.startPooling()
        }, interval)
    },
    callAPI: function(cfg, symbol, callback) {
        var url = ''
        //https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taipei/254?$top=30&$format=JSON
        url = "https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/"
        // symbol = city
        // cfg.apiKey = route
        url += symbol + "/" + cfg.apiKey + "?$top=1&$format=JSON"
        //url += symbol + "?$top=30&$format=JSON"

        axios.get(url, {
            headers: getAuthorizationHeader(),
        })
        .then(function(response) {
            console.log(response.data);
            var series = response.data
            var keys = Object.keys(series)

            for (k in keys) {
                var index = keys[k]
                var item = {
                    "symbol": symbol,
                    "date": index,
                    "stopid": series[k]["StopUID"],
                    "stopname": series[k]["StopName"][0],
                    "routename": series[k]["RouteName"][0],
                    "direction": series[k]["Direction"],
                    "estimate": series[k]["EstimateTime"],
                    "stopstatus": series[k]["StopStatus"],
                    }
                callback('UPDATE', item)
            }
        });
     },

    prepareScan: function() {
        for (s in this.config.symbols) {
            var symbol = this.config.symbols[s]
            this.pooler.push(symbol)
        }
    },
});
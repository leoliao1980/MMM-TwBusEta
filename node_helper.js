var NodeHelper = require("node_helper");

// add require of other javascripot components here
//const axios = require('axios');
//const jsSHA = require('jssha');
//const fs = require('fs');
//const iconv = require('iconv-lite');
//const utf8 = require('utf8');
/* //do i need this ?
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
*/

module.exports = NodeHelper.create({
    start() {
        console.log('Starting module helper:' +this.name);
        this.config = null
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
        var url = ""
        //https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taipei/254?$top=30&$format=JSON
        url = "https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/"
        // symbol = city
        // cfg.apiKey = route
        url += symbol + "/" + cfg.apiKey + "?$top=1&$format=JSON"
        //url += symbol + "?$top=30&$format=JSON"

        request(url, (error, response, body) => {
            //console.log("[AVSTOCK] API is called - ", symbol)
            var data = null
            if (error) {
                console.log("[TWBUSETA] API Error: ", error)
                return
            }
            data = JSON.parse(body)
            if (data.hasOwnProperty("Note")) {
                console.log("[TWBUSETA] Error: API Call limit exceeded.")
            }
            if (data.hasOwnProperty("Error Message")) {
                console.log("[TWBUSETA] Error:", data["Error Message"])
            }
            //if (!data["Global Quote"].hasOwnProperty("01. symbol")) {
            //  console.log("[TWBUSETA] Data Error: There is no available data for", symbol)
            //}
            //console.log("[AVSTOCK] Response is parsed - ", symbol)
            var series = data
            var keys = Object.keys(series)
            //var dayLimit = (cfg.chartDays > 90) ? 90 : cfg.chartDays
            //var keys = keys.sort().reverse().slice(0, dayLimit)
            var ts = []
            for (k in keys) {
                //var index = keys[k]
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
                //item.candle = ((item.close - item.open) >= 0) ? "up" : "down"
                ts.push(item)
            }
            callback('UPDATE_SERIES', ts)
/*
   {
      "StopUID":"TPE17678",
      "StopID":"17678",
      "StopName":{
         "Zh_tw":"師大",
         "En":"National Taiwan Normal U."
      },
      "RouteUID":"TPE10783",
      "RouteID":"10783",
      "RouteName":{
         "Zh_tw":"254",
         "En":"254"
      },
      "Direction":1,
      "EstimateTime":85,
      "StopStatus":0,
      "MessageType":0,
      "SrcUpdateTime":"2020-09-02T23:52:20+08:00",
      "UpdateTime":"2020-09-02T23:52:26+08:00"
   },
   {
      "StopUID":"TPE17578",
      "StopID":"17578",
      "StopName":{
         "Zh_tw":"景平路景德街口",
         "En":"Jingxin New Village"
      },
      "RouteUID":"TPE10783",
      "RouteID":"10783",
      "RouteName":{
         "Zh_tw":"254",
         "En":"254"
      },
      "Direction":0,
      "StopStatus":3,
      "MessageType":0,
      "SrcUpdateTime":"2020-09-02T23:52:20+08:00",
      "UpdateTime":"2020-09-02T23:52:26+08:00"
   },
{
BusN1EstimateTime {
    StopUID (string, optional): 站牌唯一識別代碼，規則為 {業管機關簡碼} + {StopID}，其中 {業管機關簡碼} 可於Authority API中的AuthorityCode欄位查詢 ,
    StopID (string, optional): 地區既用中之站牌代碼(為原資料內碼) ,
    StopName (NameType, optional): 站牌名 ,
    RouteUID (string, optional): 路線唯一識別代碼，規則為 {業管機關代碼} + {RouteID}，其中 {業管機關代碼} 可於Authority API中的AuthorityCode欄位查詢 ,
    RouteID (string, optional): 地區既用中之路線代碼(為原資料內碼) ,
    RouteName (NameType, optional): 路線名稱 ,
    Direction (integer): 去返程(該方向指的是此車牌車輛目前所在路線的去返程方向，非指站站牌所在路線的去返程方向，使用時請加值業者多加注意) : [0:'去程',1:'返程',2:'迴圈',255:'未知'] ,
    EstimateTime (integer, optional): 到站時間預估(秒) [當StopStatus値為2~4或PlateNumb値為-1時，EstimateTime値為null; 當StopStatus値為1時， EstimateTime値多數為null，僅部分路線因有固定發車時間，故EstimateTime有値; 當StopStatus値為0時，EstimateTime有値。] ,
    StopStatus (integer, optional): 車輛狀態備註 : [0:'正常',1:'尚未發車',2:'交管不停靠',3:'末班車已過',4:'今日未營運'] ,
    MessageType (integer, optional): 資料型態種類 : [0:'未知',1:'定期',2:'非定期'] ,

    SrcUpdateTime (DateTime, optional): 來源端平台資料更新時間(ISO8601格式:yyyy-MM-ddTHH:mm:sszzz)[公總使用動態即時推播故沒有提供此欄位, 而非公總系統因提供整包資料更新, 故有提供此欄] ,
    UpdateTime (DateTime): 本平台資料更新時間(ISO8601格式:yyyy-MM-ddTHH:mm:sszzz)
}
*/

        })
    },

    prepareScan: function() {
        for (s in this.config.symbols) {
            var symbol = this.config.symbols[s]
            this.pooler.push(symbol)
        }
    },
/*
    // handle messages from our module// each notification indicates a different messages
    // payload is a data structure that is different per message.. up to you to design this
    socketNotificationReceived(notification, payload) {
        console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
        // if config message from module
        if (notification === "CONFIG") {
            // save payload config info
            this.config=payload
            // wait 15 seconds, send a message back to module
            setTimeout(()=> { this.sendSocketNotification("message_from_helper"," this is a test_message")}, 15000)
        }
        else if(notification === "????2") {
        }

    },
*/
});
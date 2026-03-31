# MMM-TwBusEta

A [MagicMirror](https://magicmirror.builders/) module that displays Taiwan bus estimated time of arrival (ETA) using the [TDX (Transport Data eXchange)](https://tdx.transportdata.tw/) API.

## Screenshot

```
  254 去程
  中正紀念堂        2 分
  台大醫院          5 分
  台北車站          即將進站
  善導寺            末班車已過
                  更新時間: 14:30
```

## Prerequisites

1. Register a free account at [TDX](https://tdx.transportdata.tw/).
2. Create an application to get your **Client ID** and **Client Secret**.

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/pmmleo/MMM-TwBusEta.git
cd MMM-TwBusEta
npm install
```

## Configuration

Add the following to the `modules` array in your `config/config.js`:

```js
{
    module: "MMM-TwBusEta",
    position: "top_right",
    config: {
        clientId: "YOUR_TDX_CLIENT_ID",
        clientSecret: "YOUR_TDX_CLIENT_SECRET",
        routes: [
            { city: "Taipei", routeName: "254", direction: 0 },
            { city: "Taipei", routeName: "307", direction: 1 },
        ],
    },
}
```

### Config Options

| Option           | Default        | Description                                                       |
| ---------------- | -------------- | ----------------------------------------------------------------- |
| `clientId`       | `""`           | **(Required)** TDX API Client ID                                  |
| `clientSecret`   | `""`           | **(Required)** TDX API Client Secret                              |
| `routes`         | (see below)    | **(Required)** Array of route objects to display                   |
| `updateInterval` | `60000`        | Update interval in milliseconds (default 60 seconds)              |
| `maxStops`       | `10`           | Maximum number of stops to display per route                      |
| `language`       | `"Zh_tw"`      | Stop name language: `"Zh_tw"` (Chinese) or `"En"` (English)       |

### Route Object

| Property    | Description                                          |
| ----------- | ---------------------------------------------------- |
| `city`      | City name (e.g. `"Taipei"`, `"NewTaipei"`, `"Taichung"`, `"Kaohsiung"`) |
| `routeName` | Bus route number/name (e.g. `"254"`, `"307"`)        |
| `direction` | `0` = outbound (去程), `1` = inbound (返程)            |

### Supported Cities

`Taipei`, `NewTaipei`, `Taoyuan`, `Taichung`, `Tainan`, `Kaohsiung`, `Keelung`, `Hsinchu`, `HsinchuCounty`, `MiaoliCounty`, `ChanghuaCounty`, `NantouCounty`, `YunlinCounty`, `ChiayiCounty`, `Chiayi`, `PingtungCounty`, `YilanCounty`, `HualienCounty`, `TaitungCounty`, `KinmenCounty`, `PenghuCounty`, `LienchiangCounty`

## ETA Display

| Status        | Meaning            |
| ------------- | ------------------ |
| `X 分`        | Arriving in X min  |
| `即將進站`     | Arriving soon      |
| `尚未發車`     | Not yet departed   |
| `交管不停靠`   | Skipping (traffic) |
| `末班車已過`   | Last bus departed  |
| `今日未營運`   | Not operating      |

## License

MIT - see [LICENSE](LICENSE) for details.

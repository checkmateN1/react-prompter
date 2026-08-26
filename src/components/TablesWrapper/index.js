// Core
import React, { Component } from 'react';
import packageJson from '../../../package.json';
// import io from 'socket.io-client';  // old
import { Buffer } from 'buffer';




// Components
import Table from '../Table';
// import Table6 from '../Table6';
// import Table8 from '../Table8';
import Report from '../Report';

// Instruments
import './style.scss';

// !!!! SOCKET 4.
// import { io } from 'socket.io-client';

// !!!! SOCKET 2.
// import io from 'socket.io-client';

// !!!! WS clear
import { connectWithReconnect, MSG } from '../../sharedWS.js';

// const url = "http://localhost:27990";
// const url = "http://212.22.223.151:27990"; // mephisto
// const url = "http://212.22.223.151:27991"; // lucifer

// const token = 'uidfksicnm730pdemg662oermfyf75jdf9djf';  // simulator/debug

// console.log('typeof io =', typeof io); // должно быть 'function'

const debug_mode = false;

let k = 'aW1wb3J0IG9zCmZyb20gbW9kdWxlX3V0aWxzIGltcG9ydCBDb21wb3NpdGVNb2R1bGUKZnJvbSBleHQubW9kdWxlcy5zcGxpdF9zeW1ib2xzIGltcG9ydCBTcGxpdFN5bWJvbHNNb2R1bGUKZnJvbSBleHQubW9kdWxlcy5iaW5hcml6ZSBpbXBvcnQgQmluYXJpemVNb2R1bGUKZnJvbSBleHQubW9kdWxlcy5zdWJhcnJheXNfbGVuIGltcG9ydCBTdWJhcnJheXNMZW5Nb2R1bGUKZnJvbSBleHQubW9kdWxlcy5yYXZlbF9saXN0IGltcG9ydCBSYXZlbExpc3RNb2R1bGUKZnJvbSBleHQubW9kdWxlcy54Z2JfdHJlZSBpbXBvcnQgWEdCVHJlZU1vZHVsZQpmcm9tIGV4dC5tb2R1bGVzLnNwbGljZV9ieV9sZW4gaW1wb3J0IFNwbGljZUJ5TGVuTW9kdWxlCmZyb20gZXh0Lm1vZHVsZXMuY29sb3IgaW1wb3J0IENvbG9yTW9kdWxlCmZyb20gZXh0Lm1vZHVsZXMuc2ltaWxhcml0eSBpbXBvcnQgU2ltaWxhcml0eU1vZHVsZQpmcm9tIGV4dC5tb2R1bGVzLmRoYXNoIGltcG9ydCBESGFzaE1vZHVsZQpmcm9tIGV4dC5tb2R1bGVzLmZyb21fc3RyaW5nX3RvX2ludCBpbXBvcnQgRnJvbVN0cmluZ1RvSW50TW9kdWxlCgpjYXJkID0gQ29tcG9zaXRlTW9kdWxlKEJpbmFyaXplTW9kdWxlKDIwMCksIFhHQlRyZWVNb2R1bGUob3MucGF0aC5qb2luKHInZXh0XG1vZGVsX3dlaWdodHMnLCAnY2FyZF9yYW5rX2NsYXNzaWZpZXIuc2tsJyksIHBhZF90bz0oMzYsMzYpKSwgRnJvbVN0cmluZ1RvSW50TW9kdWxlKCkpCgp0cmFuc2Zvcm1fZGVmaW5pdGlvbnMgPSB7CgkKCSdudW1iZXJzJzogQ29tcG9zaXRlTW9kdWxlKFNwbGl0U3ltYm9sc01vZHVsZShtYXhfc2hhcGU9KDIyLDE4KSksCgkJCQkJCQlTdWJhcnJheXNMZW5Nb2R1bGUoJ3N1Ymxlbmd0aCcpLCAKCQkJCQkJCVJhdmVsTGlzdE1vZHVsZSgpLAoJCQkJCQkJQmluYXJpemVNb2R1bGUoMCksCgkJCQkJCQlYR0JUcmVlTW9kdWxlKG9zLnBhdGguam9pbihyJ2V4dFxtb2RlbF93ZWlnaHRzJywgJ251bWJlcnNfY2xhc3NpZmllcl92Mi5za2wnKSxwYWRfdG89KDIyLDE4KSksIAoJCQkJCQkJU3BsaWNlQnlMZW5Nb2R1bGUoJ3N1Ymxlbmd0aCcpKSwKCgknY29sb3InOiBDb2xvck1vZHVsZSgpLAoKCSdjYXJkJzogY2FyZCwKCSdwbF9jYXJkMSc6IGNhcmQsCgkncGxfY2FyZDInOiBjYXJkLAoKCSdzaW1pbGFyaXR5X2dnX2FsbGluJzogU2ltaWxhcml0eU1vZHVsZShyJ2V4dFxzaW1pbGFyaXR5XGdnXGFsbGluJywgMC4xNiwgRmFsc2UpLAoJJ3NpbWlsYXJpdHknOiBTaW1pbGFyaXR5TW9kdWxlKHInZXh0XHNpbWlsYXJpdHlcZ2dcYWxsaW4nLCAwLjE2LCBGYWxzZSksCgknbmlja25hbWUnOiBESGFzaE1vZHVsZSgpLAoJfQo=';
let keyBuf = Buffer.from(k, 'ascii');

let parserFrameTestArr = [];
// parserFrameTestArr.push({ id: 'test id1', hand: 'AdAs', table_id: 0, curStreetMove: 0, move_id: 3, prompterReceivedVsServerSawButtonsTimeDiff: 1001, parserTimeReceived: new Date() });
// parserFrameTestArr.push({ id: 'test id2', hand: 'AdAs', table_id: 0, curStreetMove: 0, move_id: 3, prompterReceivedVsServerSawButtonsTimeDiff: 1001, parserTimeReceived: new Date() });
// parserFrameTestArr.push({ id: 'test id3', hand: 'AdAs', table_id: 0, curStreetMove: 0, move_id: 3, prompterReceivedVsServerSawButtonsTimeDiff: 1001, parserTimeReceived: new Date() });
// parserFrameTestArr.push({ id: 'test id4', hand: 'AdAs', table_id: 0, curStreetMove: 0, move_id: 3, prompterReceivedVsServerSawButtonsTimeDiff: 1001, parserTimeReceived: new Date() });
// str += `hand: ${data.hand} // hero move buttons // table_id: ${table_id} // frame#: ${data.id}, street: ${data.curStreetMove}, move_id: ${data.move_id}, time diff from from the moment of receipt raw frame: ${data.prompterReceivedVsServerSawButtonsTimeDiff}ms \r\n`;

function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  var clone = Array.isArray(obj) ? [] : {};

  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }

  return clone;
}

const arrToText = () => {
  let str = '';
  parserFrameTestArr.forEach(data => {
    str += `${new Date().toLocaleString("en-US", { timeZone: "Europe/Riga" })} // hand: ${data.hand} // id: ${data.table_id} // hero move buttons // frame#: ${data.id}, street: ${data.curStreetMove}, move_id: ${data.move_id}, time diff from from the moment of receipt raw frame: ${data.prompterReceivedVsServerSawButtonsTimeDiff}ms \r\n`;
  });
  return str;
}

setInterval(() => {
  parserFrameTestArr = parserFrameTestArr.filter(el => new Date() - el.parserTimeReceived < 300000);
}, 120000);


// const system_fake__dict = {
//   prompt: 'localhost',
//   hand_prompt: 'socket',
//   hand_prompt_ev: 'network',
// }

const decoder = (data) => {
  if (typeof data === 'string') {
    let strBuf = Buffer.from(data, 'base64');
    let outBuf = Buffer.alloc(strBuf.length);

    for (let n = 0; n < strBuf.length; n++)
      outBuf[n] = strBuf[n] ^ keyBuf[n % keyBuf.length];

    data = outBuf.toString();

    if (typeof data === 'string') {        // new json
      data = JSON.parse(data);
    }

    return data;
  }

  // console.log(data)
  // return data;
}

const encrypting = (data) => {
  let strBuf = Buffer.from(JSON.stringify(data));
  let outBuf = Buffer.alloc(strBuf.length);

  for (let n = 0; n < strBuf.length; n++)
    outBuf[n] = strBuf[n] ^ keyBuf[n % keyBuf.length];

  return outBuf.toString('base64');
}

const playersCountArr = [];
const HIGHLIGHT_DIFFICULT_SPOTS_ENABLED_STORAGE_KEY = 'highlightDifficultSpotsEnabled';
const HIGHLIGHT_DIFFICULT_SPOTS_COLOR_STORAGE_KEY = 'highlightDifficultSpotsColor';
const LEGACY_PROMPT_DELAY_ENABLED_STORAGE_KEY = 'promptDelayEnabled';
const DEFAULT_DIFFICULT_SPOT_HIGHLIGHT_COLOR = '#767676';
const DIFFICULT_SPOT_HIGHLIGHT_COLORS = [
  '#d2d2d2',
  '#c2c2c2',
  '#b2b2b2',
  '#a2a2a2',
  '#929292',
  '#828282',
  '#767676',
  '#626262',
  '#cbd1d4',
  '#b9c2c7',
  '#a8b4bb',
  '#96a5ae',
  '#8497a1',
  '#728893',
  '#607a86',
  '#4e6b79',
  '#ccd3d1',
  '#bac5c2',
  '#a8b7b3',
  '#96a9a4',
  '#849b95',
  '#728d86',
  '#607f77',
  '#4e7168',
  '#ced4cc',
  '#bec8b9',
  '#adbba6',
  '#9daf94',
  '#8ca281',
  '#7c966f',
  '#6b895c',
  '#5b7d4a',
];

const setAndGetPlCount = (id, count) => {
  id = +id;
  if (count !== undefined) {
    playersCountArr[id] = count;
  }

  return playersCountArr[id]
}


class TablesWrapper extends Component {
  constructor() {
    super();
    this.mergeAdaptPlayers = this.mergeAdaptPlayers.bind(this);
    this.supportReport = this.supportReport.bind(this);
  }

  highlightDifficultSpotsDemoTimer = null;

  state = {
    isButtons0: false,
    isButtons1: false,
    isButtons2: false,
    isButtons3: false,
    isButtons4: false,
    isButtons5: false,
    isButtons6: false,
    isButtons7: false,
    isButtons8: false,
    isButtons9: false,
    isButtons10: false,
    isButtons11: false,
    isButtons12: false,
    isButtons13: false,
    isButtons14: false,
    table0: {},
    table1: {},
    table2: {},
    table3: {},
    table4: {},
    table5: {},
    table6: {},
    table7: {},
    table8: {},
    table9: {},
    table10: {},
    table11: {},
    table12: {},
    table13: {},
    table14: {},
    shkaf_table0: {},
    shkaf_table1: {},
    shkaf_table2: {},
    shkaf_table3: {},
    shkaf_table4: {},
    shkaf_table5: {},
    shkaf_table6: {},
    shkaf_table7: {},
    shkaf_table8: {},
    shkaf_table9: {},
    shkaf_table10: {},
    shkaf_table11: {},
    shkaf_table12: {},
    shkaf_table13: {},
    shkaf_table14: {},
    hand0: {},
    hand1: {},
    hand2: {},
    hand3: {},
    hand4: {},
    hand5: {},
    hand6: {},
    hand7: {},
    hand8: {},
    hand9: {},
    hand10: {},
    hand11: {},
    hand12: {},
    hand13: {},
    hand14: {},
    handEV0: {},
    handEV1: {},
    handEV2: {},
    handEV3: {},
    handEV4: {},
    handEV5: {},
    handEV6: {},
    handEV7: {},
    handEV8: {},
    handEV9: {},
    handEV10: {},
    handEV11: {},
    handEV12: {},
    handEV13: {},
    handEV14: {},
    playersCount0: {},
    playersCount1: {},
    playersCount2: {},
    playersCount3: {},
    playersCount4: {},
    playersCount5: {},
    playersCount6: {},
    playersCount7: {},
    playersCount8: {},
    playersCount9: {},
    playersCount10: {},
    playersCount11: {},
    playersCount12: {},
    playersCount13: {},
    playersCount14: {},
    token: '',
    server1: '',
    server2: '',
    isConnected: false,
    isPaused: false,
    tableCount: '12',
    highlightDifficultSpotsEnabled: true,
    highlightDifficultSpotsColor: DEFAULT_DIFFICULT_SPOT_HIGHLIGHT_COLOR,
    isHighlightColorPickerOpen: false,
    isHighlightDifficultSpotsDemoActive: false,
    tableOrder: '1',
    playersCount: '3',
    isSizingHide: true,
    isConnectionHide: false,
    favoriteSizings: {
      preflopSizingsSbLimp: 'true',
      preflopSizingsSbLimpIso: 'true',
    },
    isPreflopSizings: false,
    alertNotification: '',
    mergePlayerMaster: null,   // { handNumber, chair, handsCount, backgroundImage }
    mergePlayerSlave: null,   // { handNumber, chair, handsCount, backgroundImage }
    mergePlayerSlaveReset: null,
    isResetPending: false,
    baraban: {
      '5': { dateNow: 0, serviceData: {} },
      '10': { dateNow: 0, serviceData: {} },
      '20': { dateNow: 0, serviceData: {} },
      '50': { dateNow: 0, serviceData: {} },
      '100': { dateNow: 0, serviceData: {} },
      '200': { dateNow: 0, serviceData: {} }
    },
  };

  componentWillUnmount() {
    if (this.highlightDifficultSpotsDemoTimer) {
      clearTimeout(this.highlightDifficultSpotsDemoTimer);
      this.highlightDifficultSpotsDemoTimer = null;
    }
  }

  componentDidMount() {
    const token = localStorage.getItem('token');
    const server1 = localStorage.getItem('server1');
    const server2 = localStorage.getItem('server2');
    const playersCount = localStorage.getItem('playersCount');
    const tableCount = localStorage.getItem('tableCount');
    const highlightDifficultSpotsEnabled = localStorage.getItem(HIGHLIGHT_DIFFICULT_SPOTS_ENABLED_STORAGE_KEY);
    const legacyPromptDelayEnabled = localStorage.getItem(LEGACY_PROMPT_DELAY_ENABLED_STORAGE_KEY);
    const highlightDifficultSpotsColor = localStorage.getItem(HIGHLIGHT_DIFFICULT_SPOTS_COLOR_STORAGE_KEY);


    const favorite = localStorage.getItem('favoriteSizings');
    // const favorite = localStorage.setItem('favoriteSizings', JSON.stringify({test: true}));

    // baraban cleaner
    setInterval(() => {
      // console.log('baraban interval cleaner');
      this.checkAndResetBaraban()
    }, 1200);  // was 500

    let favoriteSizings = {};
    try {
      // window.addEventListener('online', () => {
      //   const { client, isConnected, server1, token } = this.state;
      //   // Если сокет уже есть — connectWithReconnect сам восстановится.
      //   // Если сокета нет, но конфиг задан — стартуем.
      //   if (!client && !isConnected && token && server1) {
      //     this.startListener();
      //   }
      // });
      window.addEventListener('offline', () => {
        this.setState({ isConnected: false });
      });

      favoriteSizings = JSON.parse(favorite);
      if (!favoriteSizings) {
        favoriteSizings = {
          preflopSizingsSbLimp: 'true',
          preflopSizingsSbLimpIso: 'true',
        };
      }
    } catch (e) {
      console.log(e.message);
      favoriteSizings = {
        preflopSizingsSbLimp: 'true',
        preflopSizingsSbLimpIso: 'true',
      };
    }

    this.setState({
      token: token || '',
      server1: server1 || '',
      server2: server2 || '',
      favoriteSizings,
      playersCount: playersCount || '3',
      tableCount: tableCount || '12',
      highlightDifficultSpotsEnabled: highlightDifficultSpotsEnabled !== null
          ? highlightDifficultSpotsEnabled !== 'false'
          : legacyPromptDelayEnabled !== 'false',
      highlightDifficultSpotsColor: DIFFICULT_SPOT_HIGHLIGHT_COLORS.includes(highlightDifficultSpotsColor)
          ? highlightDifficultSpotsColor
          : DEFAULT_DIFFICULT_SPOT_HIGHLIGHT_COLOR,
    });
  }

  checkAndResetBaraban = () => {
    this.setState(prevState => {
      const baraban = { ...prevState.baraban };

      Object.keys(baraban).forEach(limit => {
        const item = baraban[limit];

        if (item && Date.now() - item.dateNow > 1000) {
          baraban[limit] = {
            dateNow: 0,
            serviceData: {}
          };
        }
      });

      return { baraban };
    });
  };

  getHandPromptDifficultSpotMs = (handPrompt) => {
    const promptTimingOffsetData = handPrompt && handPrompt.promptTimingOffsetData
        ? handPrompt.promptTimingOffsetData
        : {};

    const difficultSpotMs = +promptTimingOffsetData.promptShowDelayMs;

    if (difficultSpotMs && !isNaN(difficultSpotMs)) {
      return Math.max(0, difficultSpotMs);
    }

    return 0;
  };

  setHandPromptWithDifficultSpotHighlight = (data) => {
    if (!data || data.id === undefined) {
      return;
    }

    const id = data.id;
    const handPrompt = data.hand_prompt || {};
    const difficultSpotMs = this.getHandPromptDifficultSpotMs(handPrompt);
    const stateKey = 'hand' + id;
    const playersCountKey = 'playersCount' + id;

    this.setState({
      [stateKey]: Object.assign({}, handPrompt, {
        hasDifficultSpotHighlight: this.state.highlightDifficultSpotsEnabled && difficultSpotMs > 0 && !handPrompt.turnOffButtons,
        promptShowDelayMs: difficultSpotMs,
      }),
      [playersCountKey]: setAndGetPlCount(data.id, data.playersCount),
    });
  };


  startListener = () => {
    const {
      token,
      server1,
      server2,
    } = this.state;
    const softVersion = packageJson && packageJson.version ? packageJson.version : 'unknown';

    const { client } = connectWithReconnect(server1, WebSocket, {
      role: 'client', timeout: 60000, reconnection: true, heartbeatMs: 15000, idleTimeoutMs: 60000, debugId: 'ui'
    });

    client.on(MSG.OPEN, () => {
      client.emit('authorization', {
        token,
        isPrompter: true,
        clientData: {
          softVersion,
          clientName: 'react-prompter',
          clientType: 'prompter',
        },
      });
    });

    client.on('connect_error', (e) => console.log('ERR', e && e.message));

    client.on('authorizationSuccess', () => {
      console.log('authorization success: client');

      this.setState({
        isConnected: true,
        isPaused: false,
        client,
      });

      document.getElementById('connection-settings').classList.add('on');

      localStorage.setItem('token', token);
      localStorage.setItem('server1', server1);
      localStorage.setItem('server2', server2 || '');

      client.emit('clientData', {
        softVersion,
        clientName: 'react-prompter',
        clientType: 'prompter',
      });
      client.emit('startPromptSending');

      client.emit('favoriteSizings', { favoriteSizings: this.state.favoriteSizings, token });
    });

    // alertNotification
    client.on("sysupdate", data => {
      data = decoder(data)

      console.log('got alert!');
      this.setState({
        alertNotification: data.message,
      });

      if (data.showTime) {
        setTimeout(() => {
          this.setState({
            alertNotification: "",
          });
        }, data.showTime);
      }
    });

    // BARABAN
    client.on("localBridge", data => {
      const { limitPRO, serviceData } = data;
      console.log('got baraban// limitPRO:', limitPRO);
      console.log('got baraban// serviceData:', serviceData);
      // baraban: {
      //       '5': { dateNow: 0, maxNick: 'nickname' },
      //       '10': { dateNow: 0, maxNick: 'nickname' },
      //       '20': { dateNow: 0, maxNick: 'nickname' },
      //       '50': { dateNow: 0, maxNick: 'nickname' },
      //       '100': { dateNow: 0, maxNick: 'nickname' },
      //       '200': { dateNow: 0, maxNick: 'nickname' },
      // },

      const { baraban } = this.state;

      if (baraban[limitPRO] !== undefined) {
        const barabanNew = deepClone(baraban);
        barabanNew[limitPRO] = { dateNow: new Date().valueOf(), serviceData };
        this.setState({
          baraban: barabanNew
        });
      }
    });

    client.on("localBridge", data => {
      const { limitPRO, serviceData } = data;
      console.log('got baraban data: ', data);
      // baraban: {
      //   '5': { dateNow: 0, serviceData: {} },
      //   '10': { dateNow: 0, serviceData: {} },
      //   '20': { dateNow: 0, serviceData: {} },
      //   '50': { dateNow: 0, serviceData: {} },
      //   '100': { dateNow: 0, serviceData: {} },
      //   '200': { dateNow: 0, serviceData: {} }
      // },

      this.setState(prevState => {
        const { baraban } = prevState;

        if (!(limitPRO in baraban)) {
          return null; // React: ничего не менять
        }

        return {
          baraban: {
            ...baraban,
            [limitPRO]: {
              dateNow: Date.now(),
              serviceData
            }
          }
        };
      });
    });

    // HAND_SHKAF
    client.on("NetSync", data => {
      // for (let i = 0; i < 3; i++) {
      //   console.log('%c got shkaf data ', 'background: red; color: white; font-size: 32px; padding: 2px;');
      // }

      data = decoder(data);
      const id = data.shkaf_table_id;

      // console.log('got shkaf data!');
      this.setState({
        ['shkaf_table' + id]: data.shkafData,
      });
    });

    // prompt
    // client.on("localhost", data => {
    //   data = decoder(data)
    //   // if (data.id === 5) {
    //   //   console.log('prompt id 5 // data.playersCount: ', data.playersCount);
    //   // }
    //   this.setState({
    //     ['table' + data.id]: data.prompt,
    //     ['playersCount' + data.id]: setAndGetPlCount(data.id, data.playersCount),
    //   });
    //
    //   if (data.playersCount && data.playersCount !== this.state.playersCount) {
    //     this.setState({
    //       playersCount: data.playersCount,
    //     });
    //
    //     localStorage.setItem('playersCount', data.playersCount);
    //   }
    // });

    // prompt
    client.on("localhost", data => {
      data = decoder(data);

      this.setState(prevState => {
        const nextState = {};

        if (data.situationHash !== undefined) {
          const oldPrompt = prevState['table' + data.id];

          nextState['table' + data.id] = oldPrompt
              ? {
                ...oldPrompt,
                situationHash: data.situationHash,
              }
              : oldPrompt;
        } else {
          nextState['playersCount' + data.id] = setAndGetPlCount(data.id, data.playersCount);
          nextState['table' + data.id] = data.prompt;
        }

        if (data.playersCount && data.playersCount !== prevState.playersCount) {
          nextState.playersCount = data.playersCount;
          localStorage.setItem('playersCount', data.playersCount);
        }

        return nextState;
      });
    });

    // isButtons
    client.on("syncHelper", data => {
      data = decoder(data)

      this.setState({
        ['isButtons' + data.id]: data.isButtons,
      });
    });

    // ЛЕГКИЙ пинг
    // client.on("dataSyncer", num => {
    //   const now = new Date();
    //   const prmTimeReceived = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}`;
    //   client.emit('netMirrorBack', { num, prmTimeReceived });
    // });

    // hand_prompt
    client.on("socket", data => {
      try {
        data = decoder(data);

        // if (data.id === 5) {
        //   console.log('hand_prompt id 5 // data.playersCount: ', data.playersCount);
        // }
        this.setHandPromptWithDifficultSpotHighlight(data);

        // Prompt highlighting no longer depends on ping timing.
        // if (client && data && data.hand_prompt && data.promptUniqid) {
        //   const dataToSend = { promptUniqid: data.promptUniqid, timestamp: data.timestamp, heroHand: data.heroHand, id: data.id, token: data.token, frame_id: data.frame_id }
        //   client.emit('netMirror', encrypting(dataToSend));
        // }

        // ТЯЖЕЛЫЙ пинг
        // if (client && data && data.hand_prompt_uniqueId && data.timestamp) {
        //   if (client) {
        //     const dataToSend = { hand_prompt_uniqueId: data.hand_prompt_uniqueId, timestamp: data.timestamp }
        //     client.emit('netMirror', encrypting(dataToSend));
        //   }
        // }
      } catch (e) {
        console.log(e.message);
      }

      // логируем в стейт время получения подсказки по фрейму если есть стратегия!
      // if (data.hand_prompt && data.hand_prompt.strategy && data.hand_prompt.parserFrameTestSeeButtonsData) {
      //   // parserFrameTestSeeButtonsData { id, move_id, parserTimeReceived: new Date(), parserTimeReceivedGetTime: new Date().getTime(), hand, token } // id === parser frame id
      //   // пишем в массив parserFrameTestArr поток parserFrameTestSeeButtonsData
      //   // так же пишем интервал, который раз в 3минуты чистит массив от старых записей
      //
      //   // new
      //   const parserFrameTestSeeButtonsBackData = Object.assign(data.hand_prompt.parserFrameTestSeeButtonsData, { table_id: data.id });
      //   const { client } = this.state;
      //
      //   if (client) {
      //     client.emit('sysRequest', encrypting(parserFrameTestSeeButtonsBackData));
      //   }
      //   // old
      //   // parserFrameTestArr.push()
      // }
    });

    // HAND_PROMPT_EV
    client.on("network", data => {
      data = decoder(data)
      // console.log(data);
      this.setState({
        ['handEV' + data.id]: data.hand_prompt,
      });
    });

    client.on("originalResult", data => {
      if (data) {
        const { mergePlayerMaster, mergePlayerSlave, isResetPending } = this.state;
        const mergePlayerMasterOriginal = decoder(data);
        // console.log(data);
        // const player = { handNumber, chair, handsCount: playersState[chair].handsCount, backgroundImage: playersState[chair].img };
        if (mergePlayerMaster && !mergePlayerSlave && mergePlayerMaster.handNumber === mergePlayerMasterOriginal.handNumber && mergePlayerMaster.chair === mergePlayerMasterOriginal.chair && mergePlayerMasterOriginal.pl_img_original) {
          this.setState({
            mergePlayerSlaveReset: Object.assign({}, mergePlayerMaster, { backgroundImage: mergePlayerMasterOriginal.pl_img_original }),
          })
        }
      }
    });

    // client.on("debugInfo", data => {
    //   console.log(data);
    //   const {
    //     id,
    //     hand,
    //     aggregatorLock,
    //     move,
    //     aggregatorFree,
    //     sessionsQueue,
    //     tasksSimulationsQueue,
    //   } = data;
    //   this.setState(prevState => {
    //     return {
    //       ['table' + id]: {
    //         ...prevState['table' + id],
    //         debug_hand: hand,
    //         debug_aggregatorLock: aggregatorLock,
    //         debug_move: move,
    //       },
    //       debug_info: {
    //         aggregatorFree,
    //         sessionsQueue,
    //         tasksSimulationsQueue,
    //       }
    //     }
    //   });
    // });

    // Не закрываем клиент — даём connectWithReconnect самому восстановиться
    client.on(MSG.CLOSE, () => {
      console.log('[ui] ws closed – waiting for auto-reconnect');
      this.setState({ isConnected: false });
      document.getElementById('connection-settings').classList.remove('on');
    });
  };

  supportReport = (data) => {
    const { client, playersCount } = this.state;

    if (client) {
      client.emit('getSystem', encrypting( Object.assign({ playersCount }, data) ));
    }
  };

  mergeAdaptPlayers = (player) => {
    const { mergePlayerMaster, client } = this.state;

    if (!mergePlayerMaster) {
      this.setState({
        mergePlayerMaster: player,
        isResetPending: false,
      })
      client.emit('getOriginal', encrypting( { mergePlayerMaster: Object.assign({}, player) } ));
    } else {
      if (mergePlayerMaster.handNumber !== player.handNumber && mergePlayerMaster.handsCount !== player.handsCount) {
        this.setState({
          mergePlayerSlave: player,
          isResetPending: false,
        })
      }
    }
  };

  confirmMergingAdaptPlayers = (e) => {
    const isOk = e.target.value === 'true';
    const { mergePlayerMaster, mergePlayerSlave, client } = this.state;

    if (isOk && client && mergePlayerMaster && mergePlayerSlave) {
      client.emit('mergeData', encrypting( { mergePlayerMaster: Object.assign({}, mergePlayerMaster), mergePlayerSlave: Object.assign({}, mergePlayerSlave) } ));
    }

    this.setState({
      mergePlayerMaster: null,
      mergePlayerSlave: null,
      mergePlayerSlaveReset: null,
      isResetPending: false,
    })
  };

  resetPlayersInDbPending = () => {
    const { mergePlayerMaster, mergePlayerSlave, mergePlayerSlaveReset, client } = this.state;

    if (client && mergePlayerMaster && !mergePlayerSlave) {
      // const player = { handNumber, chair, handsCount: playersState[chair].handsCount, backgroundImage: playersState[chair].img };

      this.setState({
        isResetPending: true,
      })
    }
  };
  resetPlayersInDb = () => {
    const { mergePlayerMaster, mergePlayerSlave, mergePlayerSlaveReset, client } = this.state;

    if (client && mergePlayerMaster && !mergePlayerSlave && mergePlayerSlaveReset) {
      client.emit('resetData', encrypting( { mergePlayerMaster: Object.assign({}, mergePlayerMaster, { backgroundImage: mergePlayerSlaveReset.backgroundImage }) } ));
      this.setState({
        mergePlayerMaster: null,
        mergePlayerSlave: null,
        mergePlayerSlaveReset: null,
        isResetPending: false,
      })
    }
  };

  tokenHandler = (e) => {
    this.setState({
      token: e.target.value
    })
  };

  tableCountHandler = (e) => {
    const data = e.target.value;
    this.setState({
      tableCount: data
    })

    localStorage.setItem('tableCount', data);
  };

  highlightDifficultSpotsEnabledHandler = (e) => {
    const highlightDifficultSpotsEnabled = e.target.checked;

    localStorage.setItem(HIGHLIGHT_DIFFICULT_SPOTS_ENABLED_STORAGE_KEY, highlightDifficultSpotsEnabled ? 'true' : 'false');

    this.setState({ highlightDifficultSpotsEnabled });
  };

  toggleHighlightColorPicker = () => {
    this.setState(prevState => ({
      isHighlightColorPickerOpen: !prevState.isHighlightColorPickerOpen
    }));
  };

  highlightDifficultSpotsColorHandler = (color) => {
    if (!DIFFICULT_SPOT_HIGHLIGHT_COLORS.includes(color)) {
      return;
    }

    if (this.highlightDifficultSpotsDemoTimer) {
      clearTimeout(this.highlightDifficultSpotsDemoTimer);
    }

    localStorage.setItem(HIGHLIGHT_DIFFICULT_SPOTS_COLOR_STORAGE_KEY, color);

    this.setState({
      highlightDifficultSpotsColor: color,
      isHighlightColorPickerOpen: false,
      isHighlightDifficultSpotsDemoActive: true,
    });

    this.highlightDifficultSpotsDemoTimer = setTimeout(() => {
      this.highlightDifficultSpotsDemoTimer = null;
      this.setState({ isHighlightDifficultSpotsDemoActive: false });
    }, 2500);
  };

  preflopPostflopSizingsHandler = () => {
    this.setState(prevState => {
      return {
        isPreflopSizings: !prevState.isPreflopSizings
      }
    })
  };

  isSbLimpHandler = () => {
    this.setState(prevState => {
      const favoriteSizings = prevState.favoriteSizings;
      favoriteSizings.preflopSizingsSbLimp = favoriteSizings.preflopSizingsSbLimp === 'true' ? 'false' : 'true';
      return {
        favoriteSizings
      }
    })
  };

  isSbLimpHandlerIso = () => {
    this.setState(prevState => {
      const favoriteSizings = prevState.favoriteSizings;
      favoriteSizings.preflopSizingsSbLimpIso = favoriteSizings.preflopSizingsSbLimpIso === 'true' ? 'false' : 'true';
      return {
        favoriteSizings
      }
    })
  };

  srv1Handler = (e) => {
    this.setState({
      server1: e.target.value
    })
  };

  connectHandler = () => {
    const {
      token,
      server1,
      isConnected
    } = this.state;

    if (token && server1 && !isConnected) {
      this.startListener();
    }
  };

  pauseHandler = () => {
    this.setState(prevState => {
      return {
        isPaused: prevState.isPaused,
      }
    })
  };

  sizingsHideHandler = () => {
    const isSizingHide = this.state.isSizingHide;
    this.setState( {
      isSizingHide: !isSizingHide,
    });

    if (!isSizingHide) {
      localStorage.setItem('favoriteSizings', JSON.stringify(this.state.favoriteSizings));
    }

    const client = this.state.client;
    if (client) {
      client.emit('favoriteSizings', this.state.favoriteSizings);
    }
  };

  sizingChange = (e) => {
    const id = e.target.id;
    const value = e.target.value;

    if (id !== 'checkbox-postflop-sizings' && id !== 'checkbox-preflop-sizings') {
      this.setState(prevState => {
        const sizings = prevState.favoriteSizings;
        sizings[id] = value;
        // console.log(sizings);

        return {
          favoriteSizings: sizings,
        }
      });
    }
  };

  connectionHideHandler = () => {
    const el = document.getElementById('connection-settings');

    const isConnectionHide = this.state.isConnectionHide;
    this.setState( {
      isConnectionHide: !isConnectionHide,
    });

    if (isConnectionHide) {
      el.classList.add('connection-showed')
      el.classList.remove('connection-hided')
    } else {
      el.classList.add('connection-hided')
      el.classList.remove('connection-showed')
    }

  };

  disconnectHandler = () => {
    const {
      client,
    } = this.state;

    this.setState({
      client: null,
      isConnected: false,
      isPaused: false,
    });

    document.getElementById('connection-settings').classList.remove('on');

    if (client) {
      client.disconnect();
    }
  };

  download = (filename, text) => {
    // console.log(text);
    let pom = document.createElement('a');
    // pom.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    pom.style.display = 'none';
    document.body.appendChild(pom);

    pom.click();

    document.body.removeChild(pom);
  };

  render() {
    const {
      isButtons0 = false,
      isButtons1 = false,
      isButtons2 = false,
      isButtons3 = false,
      isButtons4 = false,
      isButtons5 = false,
      isButtons6 = false,
      isButtons7 = false,
      isButtons8 = false,
      isButtons9 = false,
      isButtons10 = false,
      isButtons11 = false,
      isButtons12 = false,
      isButtons13 = false,
      isButtons14 = false,
      table0 = {},
      table1 = {},
      table2 = {},
      table3 = {},
      table4 = {},
      table5 = {},
      table6 = {},
      table7 = {},
      table8 = {},
      table9 = {},
      table10 = {},
      table11 = {},
      table12 = {},
      table13 = {},
      table14 = {},
      shkaf_table0 = {},
      shkaf_table1 = {},
      shkaf_table2 = {},
      shkaf_table3 = {},
      shkaf_table4 = {},
      shkaf_table5 = {},
      shkaf_table6 = {},
      shkaf_table7 = {},
      shkaf_table8 = {},
      shkaf_table9 = {},
      shkaf_table10 = {},
      shkaf_table11 = {},
      shkaf_table12 = {},
      shkaf_table13 = {},
      shkaf_table14 = {},
      hand0,
      hand1,
      hand2,
      hand3,
      hand4,
      hand5,
      hand6,
      hand7,
      hand8,
      hand9,
      hand10,
      hand11,
      hand12,
      hand13,
      hand14,
      handEV0,
      handEV1,
      handEV2,
      handEV3,
      handEV4,
      handEV5,
      handEV6,
      handEV7,
      handEV8,
      handEV9,
      handEV10,
      handEV11,
      handEV12,
      handEV13,
      handEV14,
      playersCount0,
      playersCount1,
      playersCount2,
      playersCount3,
      playersCount4,
      playersCount5,
      playersCount6,
      playersCount7,
      playersCount8,
      playersCount9,
      playersCount10,
      playersCount11,
      playersCount12,
      playersCount13,
      playersCount14,
      token,
      server1,
      server2,
      debug_info = {},
      isConnected,
      isPaused,
      tableCount,
      highlightDifficultSpotsEnabled,
      highlightDifficultSpotsColor,
      isHighlightColorPickerOpen,
      isHighlightDifficultSpotsDemoActive,
      tableOrder,
      playersCount,
      isSizingHide,
      isConnectionHide,
      isPreflopSizings,
      favoriteSizings = {
        preflopSizingsSbLimp: 'true',
        preflopSizingsSbLimpIso: 'true',
      },
      alertNotification,
      mergePlayerMaster,
      mergePlayerSlave,
      mergePlayerSlaveReset,
      isResetPending,
      baraban
    } = this.state;

    const nickImgWidth = table0.plImgWidth || table1.plImgWidth || table2.plImgWidth || table3.plImgWidth || table4.plImgWidth || table5.plImgWidth || table6.plImgWidth || table7.plImgWidth || table8.plImgWidth || table9.plImgWidth || table10.plImgWidth || table11.plImgWidth || 111;
    const nickImgHeight = table0.plImgHeight || table1.plImgHeight || table2.plImgHeight || table3.plImgHeight || table4.plImgHeight || table5.plImgHeight || table6.plImgHeight || table7.plImgHeight || table8.plImgHeight || table9.plImgHeight || table10.plImgHeight || table11.plImgHeight || 20;

    const {
      limp_bet1,
      limp_bet2,
      limp_bet3,
      limp_bet4,
      limp_bet5,
      limp_raise1,
      limp_raise2,
      limp_raise3,
      iso_bet1,
      iso_bet2,
      iso_bet3,
      iso_bet4,
      iso_bet5,
      iso_raise1,
      iso_raise2,
      iso_raise3,
      raise_bet1,
      raise_bet2,
      raise_bet3,
      raise_bet4,
      raise_bet5,
      raise_raise1,
      raise_raise2,
      raise_raise3,
      _3bet_bet1,
      _3bet_bet2,
      _3bet_bet3,
      _3bet_bet4,
      _3bet_bet5,
      _3bet_raise1,
      _3bet_raise2,
      _3bet_raise3,
      preflop_raise,
      preflop_3bet_IP,
      preflop_3bet_OOP,
      preflop_4bet,
      preflop_isolate_raise,
      preflop_steal_raise,
      preflop_steal_3bet_IP,
      preflop_steal_3bet_OOP,
      preflop_steal_4bet,
      preflop_steal_SB_raise,
      preflop_steal_SB_3bet,
      preflopSizingsSbLimp = 'true',
      preflopSizingsSbLimpIso = 'true'
    } = favoriteSizings;

    const {
      aggregatorFree = true,
      sessionsQueue = '',
      tasksSimulationsQueue = '',
    } = debug_info;

    return (
        <>
          {tableCount === '15' &&
              <>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={0} playersCount={playersCount0} baraban={baraban} isButtons={isButtons0} shkaf={shkaf_table0} prompt={table0} handPrompt={hand0}
                       handEV={handEV0} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left15 top15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={1} playersCount={playersCount1} baraban={baraban}  isButtons={isButtons1} shkaf={shkaf_table1} prompt={table1} handPrompt={hand1}
                       handEV={handEV1} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle15 top15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={2} playersCount={playersCount2} baraban={baraban}  isButtons={isButtons2} shkaf={shkaf_table2} prompt={table2} handPrompt={hand2}
                       handEV={handEV2} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right15 top15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={3} playersCount={playersCount3} baraban={baraban}  isButtons={isButtons3} shkaf={shkaf_table3} prompt={table3} handPrompt={hand3}
                       handEV={handEV3} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright15 top15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={4} playersCount={playersCount4} baraban={baraban}  isButtons={isButtons4} shkaf={shkaf_table4} prompt={table4} handPrompt={hand4}
                       handEV={handEV4} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='superright15 top15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={5} playersCount={playersCount5} baraban={baraban}  isButtons={isButtons5} shkaf={shkaf_table5} prompt={table5} handPrompt={hand5}
                       handEV={handEV5} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left15 bottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={6} playersCount={playersCount6} baraban={baraban}  isButtons={isButtons6} shkaf={shkaf_table6} prompt={table6} handPrompt={hand6}
                       handEV={handEV6} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle15 bottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={7} playersCount={playersCount7} baraban={baraban}  isButtons={isButtons7} shkaf={shkaf_table7} prompt={table7} handPrompt={hand7}
                       handEV={handEV7} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right15 bottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={8} playersCount={playersCount8} baraban={baraban}  isButtons={isButtons8} shkaf={shkaf_table8} prompt={table8} handPrompt={hand8}
                       handEV={handEV8} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright15 bottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={9} playersCount={playersCount9} baraban={baraban}  isButtons={isButtons9} shkaf={shkaf_table9} prompt={table9} handPrompt={hand9}
                       handEV={handEV9} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='superright15 bottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={10} playersCount={playersCount10} baraban={baraban}  isButtons={isButtons10} shkaf={shkaf_table10} prompt={table10} handPrompt={hand10}
                       handEV={handEV10} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left15 verybottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={11} playersCount={playersCount11} baraban={baraban}  isButtons={isButtons11} shkaf={shkaf_table11} prompt={table11} handPrompt={hand11}
                       handEV={handEV11} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle15 verybottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={12} playersCount={playersCount12} baraban={baraban}  isButtons={isButtons12} shkaf={shkaf_table12} prompt={table12} handPrompt={hand12}
                       handEV={handEV12} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right15 verybottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={13} playersCount={playersCount13} baraban={baraban}  isButtons={isButtons13} shkaf={shkaf_table13} prompt={table13} handPrompt={hand13}
                       handEV={handEV13} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright15 verybottom15'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={14} playersCount={playersCount14} baraban={baraban}  isButtons={isButtons14} shkaf={shkaf_table14} prompt={table14} handPrompt={hand14}
                       handEV={handEV14} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='superright15 verybottom15'/>
              </>
          }
          {tableCount === '12' &&
              <>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={0} playersCount={playersCount0} baraban={baraban} isButtons={isButtons0} shkaf={shkaf_table0} prompt={table0} handPrompt={hand0}
                       handEV={handEV0} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={1} playersCount={playersCount1} baraban={baraban}  isButtons={isButtons1} shkaf={shkaf_table1} prompt={table1} handPrompt={hand1}
                       handEV={handEV1} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={2} playersCount={playersCount2} baraban={baraban}  isButtons={isButtons2} shkaf={shkaf_table2} prompt={table2} handPrompt={hand2}
                       handEV={handEV2} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={3} playersCount={playersCount3} baraban={baraban}  isButtons={isButtons3} shkaf={shkaf_table3} prompt={table3} handPrompt={hand3}
                       handEV={handEV3} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={4} playersCount={playersCount4} baraban={baraban}  isButtons={isButtons4} shkaf={shkaf_table4} prompt={table4} handPrompt={hand4}
                       handEV={handEV4} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={5} playersCount={playersCount5} baraban={baraban}  isButtons={isButtons5} shkaf={shkaf_table5} prompt={table5} handPrompt={hand5}
                       handEV={handEV5} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={6} playersCount={playersCount6} baraban={baraban}  isButtons={isButtons6} shkaf={shkaf_table6} prompt={table6} handPrompt={hand6}
                       handEV={handEV6} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left verybottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={7} playersCount={playersCount7} baraban={baraban}  isButtons={isButtons7} shkaf={shkaf_table7} prompt={table7} handPrompt={hand7}
                       handEV={handEV7} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle verybottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={8} playersCount={playersCount8} baraban={baraban}  isButtons={isButtons8} shkaf={shkaf_table8} prompt={table8} handPrompt={hand8}
                       handEV={handEV8} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right verybottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={9} playersCount={playersCount9} baraban={baraban}  isButtons={isButtons9} shkaf={shkaf_table9} prompt={table9} handPrompt={hand9}
                       handEV={handEV9} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={10} playersCount={playersCount10} baraban={baraban}  isButtons={isButtons10} shkaf={shkaf_table10} prompt={table10} handPrompt={hand10}
                       handEV={handEV10} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={11} playersCount={playersCount11} baraban={baraban}  isButtons={isButtons11} shkaf={shkaf_table11} prompt={table11} handPrompt={hand11}
                       handEV={handEV11} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='veryright verybottom'/>
              </>
          }
          {tableCount === '9' &&
              <>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={0} playersCount={playersCount0} baraban={baraban}  isButtons={isButtons0} shkaf={shkaf_table0} prompt={table0} handPrompt={hand0}
                       handEV={handEV0} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={1} playersCount={playersCount1} baraban={baraban}  isButtons={isButtons1} shkaf={shkaf_table1} prompt={table1} handPrompt={hand1}
                       handEV={handEV1} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={2} playersCount={playersCount2} baraban={baraban}  isButtons={isButtons2} shkaf={shkaf_table2} prompt={table2} handPrompt={hand2}
                       handEV={handEV2} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={3} playersCount={playersCount3} baraban={baraban}  isButtons={isButtons3} shkaf={shkaf_table3} prompt={table3} handPrompt={hand3}
                       handEV={handEV3} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={4} playersCount={playersCount4} baraban={baraban}  isButtons={isButtons4} shkaf={shkaf_table4} prompt={table4} handPrompt={hand4}
                       handEV={handEV4} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={5} playersCount={playersCount5} baraban={baraban}  isButtons={isButtons5} shkaf={shkaf_table5} prompt={table5} handPrompt={hand5}
                       handEV={handEV5} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={6} playersCount={playersCount6} baraban={baraban}  isButtons={isButtons6} shkaf={shkaf_table6} prompt={table6} handPrompt={hand6}
                       handEV={handEV6} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left verybottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={7} playersCount={playersCount7} baraban={baraban}  isButtons={isButtons7} shkaf={shkaf_table7} prompt={table7} handPrompt={hand7}
                       handEV={handEV7} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle verybottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={8} playersCount={playersCount8} baraban={baraban}  isButtons={isButtons8} shkaf={shkaf_table8} prompt={table8} handPrompt={hand8}
                       handEV={handEV8} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right verybottom'/>
              </>
          }
          {tableCount === '6' &&
              <>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={0} playersCount={playersCount0} baraban={baraban}  isButtons={isButtons0} shkaf={shkaf_table0} prompt={table0} handPrompt={hand0}
                       handEV={handEV0} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={1} playersCount={playersCount1} baraban={baraban}  isButtons={isButtons1} shkaf={shkaf_table1} prompt={table1} handPrompt={hand1}
                       handEV={handEV1} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={2} playersCount={playersCount2} baraban={baraban}  isButtons={isButtons2} shkaf={shkaf_table2} prompt={table2} handPrompt={hand2}
                       handEV={handEV2} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={3} playersCount={playersCount3} baraban={baraban}  isButtons={isButtons3} shkaf={shkaf_table3} prompt={table3} handPrompt={hand3}
                       handEV={handEV3} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='right bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={4} playersCount={playersCount4} baraban={baraban}  isButtons={isButtons4} shkaf={shkaf_table4} prompt={table4} handPrompt={hand4}
                       handEV={handEV4} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={5} playersCount={playersCount5} baraban={baraban}  isButtons={isButtons5} shkaf={shkaf_table5} prompt={table5} handPrompt={hand5}
                       handEV={handEV5} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left bottom'/>
              </>
          }
          {tableCount === '4' &&
              <>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={0} playersCount={playersCount0} baraban={baraban}  isButtons={isButtons0} shkaf={shkaf_table0} prompt={table0} handPrompt={hand0}
                       handEV={handEV0} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={1} playersCount={playersCount1} baraban={baraban}  isButtons={isButtons1} shkaf={shkaf_table1} prompt={table1} handPrompt={hand1}
                       handEV={handEV1} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle top'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={5} playersCount={playersCount5} baraban={baraban}  isButtons={isButtons5} shkaf={shkaf_table5} prompt={table5} handPrompt={hand5}
                       handEV={handEV5} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='left bottom'/>
                <Table highlightDifficultSpotsEnabled={highlightDifficultSpotsEnabled} highlightDifficultSpotsDemoActive={isHighlightDifficultSpotsDemoActive} highlightDifficultSpotsColor={highlightDifficultSpotsColor} id={4} playersCount={playersCount4} baraban={baraban}  isButtons={isButtons4} shkaf={shkaf_table4} prompt={table4} handPrompt={hand4}
                       handEV={handEV4} debug_mode={debug_mode} supportReport={this.supportReport}
                       mergeAdaptPlayers={this.mergeAdaptPlayers} position='middle bottom'/>
              </>
          }
          <span className='logo-footer'>Mephisto - poker artificial intelligence ©</span>
          {debug_mode &&
              <div className="debug-info">
                <div
                    className={`debug-info-str ` + (aggregatorFree ? '' : 'true')}>{'aggregatorFree:' + aggregatorFree}</div>
                <div
                    className={`debug-info-str ` + (sessionsQueue ? 'true' : '')}>{'sessionsQueue:' + sessionsQueue}</div>
                <div
                    className={`debug-info-str ` + (tasksSimulationsQueue ? 'true' : '')}>{'tasksSimulationsQueue:' + tasksSimulationsQueue}</div>
              </div>
          }
          <div id='connection-settings' className={"connection-settings connection-showed"}>
            <button className='connection-hide slider' onClick={this.connectionHideHandler}>options
              <div className="status-wrapper">
                <div className={isConnected ? 'on' : 'off'}></div>
              </div></button>

            <input placeholder="token" type="text" defaultValue={token || ''} onChange={this.tokenHandler}/>
            <input placeholder="main server" type="text" defaultValue={server1 || ''} onChange={this.srv1Handler}/>
            {/*<input placeholder="reserve server" type="text" defaultValue={server2 || ''} onChange={this.srv2Handler}/>*/}

            <div className="status-wrapper">
              <button onClick={this.connectHandler}>connect</button>
              <button onClick={this.disconnectHandler}>disconnect</button>
            </div>

            <div className="tablesCountRadio">
              <input type="radio" id="t4" value="4" name="tablesCount" checked={tableCount==='4'} onChange={this.tableCountHandler} />
              <label htmlFor="t4">4 tables</label>

              <input type="radio" id="t6" value="6" name="tablesCount" checked={tableCount==='6'} onChange={this.tableCountHandler} />
              <label htmlFor="t6">6 tables</label>

              <input type="radio" id="t9" value="9" name="tablesCount" checked={tableCount==='9'} onChange={this.tableCountHandler} />
              <label htmlFor="t9">9 tables</label>

              <input type="radio" id="t12" value="12" name="tablesCount" checked={tableCount==='12'} onChange={this.tableCountHandler} />
              <label htmlFor="t12">12 tables</label>

              <input type="radio" id="t15" value="15" name="tablesCount" checked={tableCount==='15'} onChange={this.tableCountHandler} />
              <label htmlFor="t15">15 tables</label>
            </div>

            <div className="difficultSpotHighlightControl">
              <label className="promptDelayToggle" htmlFor="highlightDifficultSpotsEnabled">
                <input
                    type="checkbox"
                    id="highlightDifficultSpotsEnabled"
                    checked={highlightDifficultSpotsEnabled}
                    onChange={this.highlightDifficultSpotsEnabledHandler}
                />
                <span className="promptDelayToggle__box"></span>
                <span>highlight difficult spots</span>
              </label>

              <button
                  type="button"
                  className="difficultSpotHighlightControl__swatch"
                  style={{ backgroundColor: highlightDifficultSpotsColor }}
                  onClick={this.toggleHighlightColorPicker}
                  title="highlight color"
              />

              {isHighlightColorPickerOpen &&
                  <div className="difficultSpotHighlightControl__palette">
                    {DIFFICULT_SPOT_HIGHLIGHT_COLORS.map(color => (
                        <button
                            type="button"
                            key={color}
                            className={`difficultSpotHighlightControl__preset ${highlightDifficultSpotsColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => this.highlightDifficultSpotsColorHandler(color)}
                            title={color}
                        />
                    ))}
                  </div>
              }
            </div>

            {debug_mode &&
                <div className="control-wrapper">
                  <button onClick={this.pauseHandler}>{isPaused ? 'play' : 'stop'}</button>
                  <div className={isPaused ? 'on' : 'off'}></div>
                </div>
            }
          </div>

          <div onChange={this.sizingChange}
               className={isSizingHide ? 'sizings-settings sizings-hided' : 'sizings-settings sizings-showed'}>
            <button className='sizings-hide' onClick={this.sizingsHideHandler}>sizings</button>
            {!isPreflopSizings &&
                <>
                  <section className="limp-pot">
                    <span>limp pot</span>
                    <div className='bets'>
                      <div><label htmlFor="bet1">bet1</label>
                        <input id='limp_bet1' value={limp_bet1} type="number"/></div>

                      <div><label htmlFor="bet2">bet2</label>
                        <input id='limp_bet2' value={limp_bet2} type="number"/></div>

                      <div><label htmlFor="bet3">bet3</label>
                        <input id='limp_bet3' value={limp_bet3} type="number"/></div>

                      <div><label htmlFor="bet4">bet4</label>
                        <input id='limp_bet4' value={limp_bet4} type="number"/></div>

                      <div><label htmlFor="bet5">bet5</label>
                        <input id='limp_bet5' value={limp_bet5} type="number"/></div>
                    </div>

                    <div className='raises'>
                      <div><label htmlFor="raise1">raise1</label>
                        <input id='limp_raise1' value={limp_raise1} type="number"/></div>

                      <div><label htmlFor="raise2">raise2</label>
                        <input id='limp_raise2' value={limp_raise2} type="number"/></div>

                      <div><label htmlFor="raise3">raise3</label>
                        <input id='limp_raise3' value={limp_raise3} type="number"/></div>
                    </div>
                  </section>

                  <section className="iso-pot">
                    <span>iso pot</span>
                    <div className='bets'>
                      <div><label htmlFor="bet1">bet1</label>
                        <input id='iso_bet1' value={iso_bet1} type="number"/></div>

                      <div><label htmlFor="bet2">bet2</label>
                        <input id='iso_bet2' value={iso_bet2} type="number"/></div>

                      <div><label htmlFor="bet3">bet3</label>
                        <input id='iso_bet3' value={iso_bet3} type="number"/></div>

                      <div><label htmlFor="bet4">bet4</label>
                        <input id='iso_bet4' value={iso_bet4} type="number"/></div>

                      <div><label htmlFor="bet5">bet5</label>
                        <input id='iso_bet5' value={iso_bet5} type="number"/></div>
                    </div>

                    <div className='raises'>
                      <div><label htmlFor="raise1">raise1</label>
                        <input id='iso_raise1' value={iso_raise1} type="number"/></div>

                      <div><label htmlFor="raise2">raise2</label>
                        <input id='iso_raise2' value={iso_raise2} type="number"/></div>

                      <div><label htmlFor="raise3">raise3</label>
                        <input id='iso_raise3' value={iso_raise3} type="number"/></div>
                    </div>
                  </section>

                  <section className="raise-pot">
                    <span>raise pot</span>
                    <div className='bets'>
                      <div><label htmlFor="bet1">bet1</label>
                        <input id='raise_bet1' value={raise_bet1} type="number"/></div>

                      <div><label htmlFor="bet2">bet2</label>
                        <input id='raise_bet2' value={raise_bet2} type="number"/></div>

                      <div><label htmlFor="bet3">bet3</label>
                        <input id='raise_bet3' value={raise_bet3} type="number"/></div>

                      <div><label htmlFor="bet4">bet4</label>
                        <input id='raise_bet4' value={raise_bet4} type="number"/></div>

                      <div><label htmlFor="bet5">bet5</label>
                        <input id='raise_bet5' value={raise_bet5} type="number"/></div>
                    </div>

                    <div className='raises'>
                      <div><label htmlFor="raise1">raise1</label>
                        <input id='raise_raise1' value={raise_raise1} type="number"/></div>

                      <div><label htmlFor="raise2">raise2</label>
                        <input id='raise_raise2' value={raise_raise2} type="number"/></div>

                      <div><label htmlFor="raise3">raise3</label>
                        <input id='raise_raise3' value={raise_raise3} type="number"/></div>
                    </div>
                  </section>

                  <section className="3bet-pot">
                    <span>3bet pot</span>
                    <div className='bets'>
                      <div><label htmlFor="bet1">bet1</label>
                        <input id='_3bet_bet1' value={_3bet_bet1} type="number"/></div>

                      <div><label htmlFor="bet2">bet2</label>
                        <input id='_3bet_bet2' value={_3bet_bet2} type="number"/></div>

                      <div><label htmlFor="bet3">bet3</label>
                        <input id='_3bet_bet3' value={_3bet_bet3} type="number"/></div>

                      <div><label htmlFor="bet4">bet4</label>
                        <input id='_3bet_bet4' value={_3bet_bet4} type="number"/></div>

                      <div><label htmlFor="bet5">bet5</label>
                        <input id='_3bet_bet5' value={_3bet_bet5} type="number"/></div>
                    </div>

                    <div className='raises'>
                      <div><label htmlFor="raise1">raise1</label>
                        <input id='_3bet_raise1' value={_3bet_raise1} type="number"/></div>

                      <div><label htmlFor="raise2">raise2</label>
                        <input id='_3bet_raise2' value={_3bet_raise2} type="number"/></div>

                      <div><label htmlFor="raise3">raise3</label>
                        <input id='_3bet_raise3' value={_3bet_raise3} type="number"/></div>
                    </div>
                  </section>
                </>
            }

            {isPreflopSizings &&
                <>
                  <section className="preflop">
                    <span>not steal</span>
                    <div className='bets'>
                      <div className='sizings-wrap'><label htmlFor="preflop-raise1">raise</label>
                        <input id='preflop_raise' value={preflop_raise} type="number"/></div>

                      {/*<div><label htmlFor="preflop-raise2">raise2</label>*/}
                      {/*  <input id='preflop_raise2' value={preflop_raise2} type="number"/></div>*/}

                      <div className='sizings-wrap'><label htmlFor="preflop-3bet1">3bet_IP</label>
                        <input id='preflop_3bet_IP' value={preflop_3bet_IP} type="number"/></div>

                      <div className='sizings-wrap'><label htmlFor="preflop-3bet2">3bet_OOP</label>
                        <input id='preflop_3bet_OOP' value={preflop_3bet_OOP} type="number"/></div>

                      {/*<div><label htmlFor="preflop-3bet2">3bet2</label>*/}
                      {/*  <input id='preflop_3bet2' value={preflop_3bet2} type="number"/></div>*/}

                      <div className='sizings-wrap'><label htmlFor="preflop-4bet1">4bet</label>
                        <input id='preflop_4bet' value={preflop_4bet} type="number"/></div>
                    </div>
                  </section>

                  <section className="preflop-isolate">
                    <span>isolate</span>
                    <div className='bets'>
                      <div className='sizings-wrap'><label htmlFor="preflop-isolate-raise1">raise</label>
                        <input id='preflop_isolate_raise' value={preflop_isolate_raise} type="number"/></div>

                      {/*<div><label htmlFor="preflop-isolate-raise2">raise2</label>*/}
                      {/*  <input id='preflop_isolate_raise2' value={preflop_isolate_raise2} type="number"/></div>*/}
                      <div className='sizings-checkbox' onChange={this.isSbLimpHandlerIso}>
                        <span>limp: </span>
                        <input id='preflopSizingsSbLimpIso' type="radio" value="true" name="SBLimpIso-sizings"
                               checked={preflopSizingsSbLimpIso === 'true'}/> on
                        <input id='preflopSizingsSbLimpIso' type="radio" value="false" name="SBLimpIso-sizings"
                               checked={preflopSizingsSbLimpIso === 'false'}/> off
                      </div>
                    </div>
                  </section>

                  <section className="preflop-steal">
                    <span>steal BTN-CO</span>
                    <div className='bets'>
                      <div className='sizings-wrap'><label htmlFor="preflop-steal-raise1">raise</label>
                        <input id='preflop_steal_raise' value={preflop_steal_raise} type="number"/></div>

                      {/*<div><label htmlFor="preflop-steal-raise2">raise2</label>*/}
                      {/*  <input id='preflop_steal_raise2' value={preflop_steal_raise2} type="number"/></div>*/}

                      <div className='sizings-wrap'><label htmlFor="preflop-steal-3bet1">3bet_IP</label>
                        <input id='preflop_steal_3bet_IP' value={preflop_steal_3bet_IP} type="number"/></div>

                      <div className='sizings-wrap'><label htmlFor="preflop-steal-3bet1">3bet_OOP</label>
                        <input id='preflop_steal_3bet_OOP' value={preflop_steal_3bet_OOP} type="number"/></div>

                      {/*<div><label htmlFor="preflop-steal-3bet2">3bet2</label>*/}
                      {/*  <input id='preflop_steal_3bet2' value={preflop_steal_3bet2} type="number"/></div>*/}

                      <div className='sizings-wrap'><label htmlFor="preflop-steal-4bet1">4bet</label>
                        <input id='preflop_steal_4bet' value={preflop_steal_4bet} type="number"/></div>
                    </div>
                  </section>

                  <section className="preflop-steal-SBvsBB">
                    <span>steal SB vs BB</span>
                    <div className='bets'>
                      <div className='sizings-wrap'><label htmlFor="preflop-steal-SB-raise">raise</label>
                        <input id='preflop_steal_SB_raise' value={preflop_steal_SB_raise} type="number"/></div>

                      {/*<div><label htmlFor="preflop-steal-SB-raise2">raise2</label>*/}
                      {/*  <input id='preflop_steal_SB_raise2' value={preflop_steal_SB_raise2} type="number"/></div>*/}

                      <div className='sizings-wrap'><label htmlFor="preflop-steal-SB-3bet1">3bet</label>
                        <input id='preflop_steal_SB_3bet' value={preflop_steal_SB_3bet} type="number"/></div>

                      {/*<div><label htmlFor="preflop-steal-SB-3bet2">3bet2</label>*/}
                      {/*  <input id='preflop_steal_SB_3bet2' value={preflop_steal_SB_3bet2} type="number"/></div>*/}

                      {/*<div><label htmlFor="preflop-steal-SB-4bet1">4bet1</label>*/}
                      {/*  <input id='preflop_steal_SB_4bet1' value={preflop_steal_SB_4bet1} type="number"/></div>*/}
                      <div className='sizings-checkbox' onChange={this.isSbLimpHandler}>
                        <span>limp: </span>
                        <input id='preflopSizingsSbLimp' type="radio" value="true" name="SBLimp-sizings"
                               checked={preflopSizingsSbLimp === 'true'}/> on
                        <input id='preflopSizingsSbLimp' type="radio" value="false" name="SBLimp-sizings"
                               checked={preflopSizingsSbLimp === 'false'}/> off
                      </div>
                    </div>
                  </section>
                </>
            }

            <div onChange={this.preflopPostflopSizingsHandler}>
              <input id='checkbox-preflop-sizings' type="radio" value="preflop" name="preflop-sizings"
                     checked={isPreflopSizings}/> preflop
              <input id='checkbox-postflop-sizings' type="radio" value="postflop" name="postflop-sizings"
                     checked={!isPreflopSizings}/> postflop
            </div>

          </div>

          {!!alertNotification && <div className='alertNotification' style={{zIndex: 2000}}>
            <input type="text" readOnly={true} value={alertNotification}/>
          </div>}

          <div className='confirmMergingWrapper'>
            {/*confirmMergingAdaptPlayers*/}
            {mergePlayerMaster && <div className='mergingPlayerWrapper'>
              {!mergePlayerSlave && !isResetPending &&
                  <button className="mergeResetPlayer" onClick={this.resetPlayersInDbPending}
                          style={{color: 'red'}}>{'RESET'}</button>}
              <div className="mergingPlayer" style={{
                backgroundImage: "url(\"data:image/png;base64," + mergePlayerMaster.backgroundImage + "\")",
                width: nickImgWidth + 'px',
                height: nickImgHeight + 'px',
                color: 'transparent'
              }}>{'master'}</div>
              {!isResetPending && <span className="mergeHandsCount">{mergePlayerMaster.handsCount}</span>}
            </div>}

            {mergePlayerSlave && <div className='mergingPlayerWrapper'>
              <div className="mergingPlayer" style={{
                backgroundImage: "url(\"data:image/png;base64," + mergePlayerSlave.backgroundImage + "\")",
                width: nickImgWidth + 'px',
                height: nickImgHeight + 'px',
                color: 'transparent'
              }}>{'slave'}</div>
              <span className="mergeHandsCount">{mergePlayerSlave.handsCount}</span>
            </div>}

            {isResetPending && mergePlayerSlaveReset && <div className='mergingPlayerWrapper'>
              <div className="mergingPlayer" style={{
                backgroundImage: "url(\"data:image/png;base64," + mergePlayerSlaveReset.backgroundImage + "\")",
                width: nickImgWidth + 'px',
                height: nickImgHeight + 'px',
                color: 'transparent'
              }}>{'slave'}</div>
            </div>}

            <div className='confirmMergingButtons'>
              {mergePlayerMaster && (mergePlayerSlave || (mergePlayerSlaveReset && isResetPending)) &&
                  <button onClick={isResetPending ? this.resetPlayersInDb : this.confirmMergingAdaptPlayers}
                          style={{color: isResetPending ? 'red' : 'green'}} className='confirmMergingButton'
                          value={'true'}>{isResetPending ? 'RESET' : 'MERGE'}</button>}
              {mergePlayerMaster && <button onClick={this.confirmMergingAdaptPlayers} style={{color: 'red'}}
                                            className='confirmMergingButton' value={'false'}>✘</button>}
            </div>
          </div>

          {/*<>*/}
          {/*  <Report handPrompt={hand0} />*/}
          {/*</>*/}
        </>
    )
        ;
  }
}

export default TablesWrapper;

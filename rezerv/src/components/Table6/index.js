// Core
import React from 'react';
import { Component } from 'react';

import AudioRecorder from '../audioReport';

// Instruments
import { enumPoker } from '../../enum';

function getTimeTellsColorgetColor(street, timeSec) {
  if (timeSec === 0) {
    return 'rgb(200,0,0)';
  }
  // пороги для каждой улицы
  const thresholds = {
    0: { fast: 3,  slow: 10 },
    1: { fast: 3,  slow: 10 },
    2: { fast: 3,  slow: 10 },
    3: { fast: 3,  slow: 10 },
  };
  const { fast, slow } = thresholds[street] || thresholds[3];

  const MAX = 200;                         // максимальная яркость канала
  const MID = Math.round(165 * MAX / 255); // «оранжевый» уровень

  // 1) зажимаем время в диапазон [0…slow]
  const tClamped = Math.max(0, Math.min(timeSec, slow));

  // 2) если в зоне [0…fast] — градиент от красного к оранжевому
  if (tClamped <= fast) {
    const t = tClamped / fast;      // 0→1
    const r = MAX;                  // всегда красный = MAX
    const g = Math.round(MID * t);  // 0→MID
    return `rgb(${r},${g},0)`;
  }

  // 3) если в зоне (fast…slow) — градиент от оранжевого к зелёному
  const t2 = (tClamped - fast) / (slow - fast); // 0→1
  const r  = Math.round(MAX * (1 - t2));        // MAX→0
  const g  = Math.round(MID + (MAX - MID) * t2); // MID→MAX
  return `rgb(${r},${g},0)`;
};

// actionsType: ['post', "bet", "raise", "call", "check", "fold"],
const moveActionName = ['P', 'B', 'R', 'C', 'X', 'F'];
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

class Table extends Component {
  constructor() {
    super();
    this.setAudioBlobParent = this.setAudioBlobParent.bind(this);
  }

  state = {
    handNumberState: -1,
    playersState: [],
    showReportButtons: false,
    reportSent: false,
    audioBlob: null,
    baraban: {
      '5': 0,
      '10': 0,
      '20': 0,
      '50': 0,
      '100': 0,
      '200': 0,
    },
    limitPro: '200',
    is6max: true,
  }

  componentDidUpdate(prevProps) {
    const { prompt } = this.props;
    const { players, handNumber } = prompt;
    if (this.state.handNumberState !== handNumber && handNumber && players && players.filter(pl => pl && !!pl.img).length) {
      this.setState({
        handNumberState: handNumber,
        playersState: deepClone(players)
      });
    }
  }

  setAudioBlobParent = (audioBlob) => {
    this.setState({
      audioBlob,
    });
  };

  getColor = (isAgro, isFold) => {
    if (isAgro) {
      return `rgb(${255}, 0, 0)`;
    } else if (isFold) {
      return `rgb(${0}, ${0}, ${0})`;
    }
    return `rgb(${255}, ${255}, 0)`;
  };

  getEvColor = (ev, maxEv, minEv) => {
    if ((maxEv - minEv) === 0) {
      return `rgb(${255}, 255, 255) !important`;
    }

    const newMin = maxEv - 0.4;
    if (ev < newMin) {
      return `rgb(${100}, 100, 100)`;
    }

    const minEvNew = Math.max(newMin, minEv);
    const OldRange = (maxEv - minEvNew);
    let NewRange = 1
    let NewValue = (((ev - minEvNew) * NewRange) / OldRange) + 0;

    return `rgb(0, ${170 * Math.max(NewValue, 0.65)}, 0)`;
  };

  getBgColor = (isAgro, isFold, checked) => {
    if (checked) {
      if (isAgro) {
        return `rgba(245, 120, 120, 0.65)`;
      } else if (isFold) {
        return `rgba(140, 140, 140, 0.65)`;
      }
      return `rgba(170, 170, 0, 0.65)`;
    } else {
      return 'transparent';
    }
  };


  getMoveType = (isAgro, isFold, wasBet, isMaxAgro, invest) => {
    if (isMaxAgro) { return 'All-in'; }
    if (isAgro) {
      return wasBet ? 'R' : 'B';
    } else if (isFold) {
      return 'Fold';
    }
    return !!invest ? 'Call' : 'Check';
  };

  handleReportClick = () => {
    const { id } = this.props;
    // console.log("double click, id: ", id);

    this.setState({
      showReportButtons: true,
    });
  };

  supportReportHandler = (e) => {
    const val = e.target.value;
    if (val === 'cancel') {
      this.setState({
        showReportButtons: false,
      });
    } else {
      const { audioBlob } = this.state;
      const {id, supportReport } = this.props;

      let txt;
      if (val === 'noPrompt') {
        txt = 'Проблемы с подсказкой';
      } else if (val === 'slow') {
        txt = 'Тормоза!';
      } else if (val === 'error') {
        txt = 'Проблемы со стратегией!';
      }

      if (audioBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          // Отправить base64data на сервер
          supportReport( { id, txt, audioBlob: base64data } );
        };
      } else { supportReport( { id, txt } ); }

      this.setState({
        showReportButtons: false,
        reportSent: true,
      });

      setTimeout(() => {
        this.setState({
          reportSent: false,
        });
      }, 2000);
    }

    return false;
  };

  // вводим переменную
  // стол знает handNumber в своем стейте. Если handNumber из пропсов совпадает с handNumber из стейта, тогда берем ники из стейта

  render() {
    const {
      playersState = [],
      handNumberState,
      showReportButtons,
      reportSent
    } = this.state;

    const {
      shkaf = {},
      prompt = {},
      handPrompt = {},
      handEV = {},
      position,
      debug_mode,
      isButtons
    } = this.props;

    const { shkafHandNumber, shkafHands = {} } = shkaf;

    const {
      is5max,
      plImgHeight = 20,
      plImgWidth = 111,
      players = [],
      pot = '',
      heroCards = '',
      board = [],
      handNumber,
      debug_hand = '',
      debug_aggregatorLock = '',
      debug_move = '',
      ante = 0,
      isSuperLowQualityHeroZeroProbabMovePH,
      bankChance,
      situationHash,
      limitPrompt
    } = prompt;

    const {
      strategy = {},
      hand_handNumber,
      wasBet,
      prevHeroAmountAtCurStreet,
      maxAmount,
      heroMoves,
      summaryStrategy = {},
      isLowQualityAfterZeroProbabMove,
      isSuperLowQualityHeroZeroProbabMove,
      promptHash,
      limit
    } = handPrompt;

    const {
      strategyEV = {},
    } = handEV;


    const isPlayersImg = handNumberState === handNumber;
    const isPromptRelevant = promptHash !== undefined && promptHash === situationHash && handNumber === hand_handNumber && isButtons;
    const isShafRelevant = handNumber === shkafHandNumber;

    const timeTellsColor = Array(players.length).fill().map((cur, i) => {
      if (players[i] && players[i].timeTells !== undefined) {
        return getTimeTellsColorgetColor(players[i].lastMoveStreet, players[i].timeTells);
      }
    });

    let movesList = [];
    let handHistory;

    const heroMovesf = heroMoves || prompt.heroMoves;
    if (heroMovesf) {
      let lastStreet = 0;
      handHistory = heroMovesf.map((move, key) => {

        const isPost = move.action === 0;
        const isLimp = move.action === 3 && move.amount === 100 && move.street === 0;

        const componentStyle = {
          color: 'black',
          fontSize: 22,
          backgroundColor: 'white',
        };

        let moveType;
        if (isPost) {
          moveType = move.isSB ? 'p' : 'P';
        }
        if (isLimp) {
          moveType = 'L'
        }
        const txt = `${(move.street !== lastStreet ? '|' : '') + (moveType || moveActionName[move.action]) + (isLimp ? '' : (move.heroMovesTxt || ''))}`;
        lastStreet = move.street;
        return <li key={key} style={componentStyle}>{txt}</li>
      });
    }

    if (isPromptRelevant) {
      let maxEv = -100500;
      let minEv = 100500;

      for (let sizing in strategy) {
        const ev = strategy[sizing].discountEv || strategy[sizing].ev;
        if (ev/100 < minEv) {
          minEv = ev/100;
        }
        if (ev/100 > maxEv) {
          maxEv = ev/100;
        }
      }

      const listKeys = Object.keys(strategy).sort((a, b) => +b - +a);
        movesList = listKeys.map(key => {
        const move = strategy[key];
        const moveEV = strategyEV[key];
        const isAgro = +key > 0;
        const isFold = key === '-1';
        const isMax = Math.max(...listKeys) === +key && +key > 0;
        const invest = maxAmount - prevHeroAmountAtCurStreet;
        const moveType = this.getMoveType(isAgro, isFold, wasBet, isMax, invest);
        let ev, evShort, discountEv;
        if (move && move.discountEv) {
          ev = `${((+move.ev)/100).toFixed(2)}`;    // + 'BB'
          evShort = `${((+move.ev)/100).toFixed(2)}`;    // + 'BB'
          discountEv = ` (${((+move.discountEv)/100).toFixed(2)})`;     // + 'BB'
        } else {
          ev = `${((+move.ev)/100).toFixed(2)}`;    // + 'BB'
        }
        const probab = `${(+move.strategy * 100).toFixed(1)}%`;
        const amount = isAgro ? (((maxAmount ? (maxAmount + +key) : +key) / 100)) : '';    // + 'BB'

        let potPercent;
        if (moveType === 'B') {
          potPercent = '(' + (amount / (pot + ante)).toFixed(2) + ')';
        } else if (moveType === 'R') {
          potPercent = '(' + ((+key / (((pot + ante) * 100) + invest))).toFixed(2) + ')';
        } else {
          potPercent = '';
        }

        const needSummaryStrategyPersent = summaryStrategy[key] !== undefined;

        let summaryStrategyPercent = needSummaryStrategyPersent ? `${(Math.abs(summaryStrategy[key]) * 100).toFixed(0)}%` : '0%';

        const componentStyle = {
          color: (isLowQualityAfterZeroProbabMove || isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? ((isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? 'lightgrey' : 'grey') : this.getColor(isAgro, isFold),
          fontSize: 27,
          backgroundColor: this.getBgColor(isAgro, isFold, move.checked),
        };

        const evStyle = {
            color: (isLowQualityAfterZeroProbabMove || isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? ((isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? 'lightgrey' : 'grey') : this.getEvColor(ev, maxEv, minEv)
        };

        return <tr key={key} style={componentStyle}>
          <td>{moveType + potPercent + ' ' + (isMax ? ' ' : ` ${amount} `)}</td>
          {/*<td className="move-ev" style={evStyle}>{ev}</td>*/}
          <td className="move-ev" style={evStyle}>
            {discountEv === undefined ? (
                ev
            ) : (
                <>
                  <span style={{ color: "gray" }}>{evShort}</span>
                  <span style={{}}>{/* discountEv2 — сюда свой стиль */}{discountEv}</span>
                </>
            )}
          </td>
          <td className="move-ev"><span className='move-probab'>{probab}</span></td>
          <td className="move-ev">{summaryStrategyPercent}</td>
        </tr>
      });
    }

    const tableStyle = {
      zIndex: 1000,
      backgroundColor: (isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? '#e38a8a' : (isLowQualityAfterZeroProbabMove ? '#e3b8b8' : 'lightgrey')
    };

    return (
        <div className={`main-container spins party-poker ${position}`} onDoubleClick={this.handleReportClick}
             style={tableStyle}>
          {(handHistory) && <ul className='hero-hand-history'>
            {handHistory}
          </ul>}
          { bankChance && <div className='bankChance'>{bankChance}</div> }
          {players[0] && players[0].isActive && <div className={`player player0-6 ${is5max ? 'max5' : 'max6'}`}>
            <div
                className="nickname player0"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[0] && playersState[0].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[0].nickname}</span>
              <span className="balance player0">{players[0].balance} BB</span>
            </div>
            {players[0].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[0].bet ? <div className={'amount ' + players[0].agroClass}>{players[0].bet} BB</div> : null}
            {isPlayersImg && playersState[0] && playersState[0].img && playersState[0].handsCount ?
                <div className={'handsCount'}>{playersState[0].handsCount}</div> : null}
            {(isShafRelevant && (players[0].enumPosition in shkafHands)) && <div className="not-hero-hand">
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[0].enumPosition].hole1Suit)]}`}>
                <div className="value">{shkafHands[players[0].enumPosition].hole1Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[0].enumPosition].hole1Suit)]}</div>
              </div>
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[0].enumPosition].hole2Suit)]}`}>
                <div className="value">{shkafHands[players[0].enumPosition].hole2Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[0].enumPosition].hole2Suit)]}</div>
              </div>
            </div>}

            {players[0].timeTells !== undefined && <div style={{ color: timeTellsColor[0] }} className='timeTells'>{players[0].timeTells}</div>}
          </div>}
          {players[1] && players[1].isActive && <div className={`player player1-6 ${is5max ? 'max5' : 'max6'}`}>
            <div
                className="nickname player1"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[1] && playersState[1].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[1].nickname}</span>
              <span className="balance player0">{players[1].balance} BB</span>
            </div>
            {players[1].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[1].bet ? <div className={'amount ' + players[1].agroClass}>{players[1].bet} BB</div> : null}
            {isPlayersImg && playersState[1] && playersState[1].img && playersState[1].handsCount ?
                <div className={'handsCount'}>{playersState[1].handsCount}</div> : null}
            {(isShafRelevant && (players[1].enumPosition in shkafHands)) && <div className="not-hero-hand">
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[1].enumPosition].hole1Suit)]}`}>
                <div className="value">{shkafHands[players[1].enumPosition].hole1Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[1].enumPosition].hole1Suit)]}</div>
              </div>
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[1].enumPosition].hole2Suit)]}`}>
                <div className="value">{shkafHands[players[1].enumPosition].hole2Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[1].enumPosition].hole2Suit)]}</div>
              </div>
            </div>}

            {players[1].timeTells !== undefined && <div style={{ color: timeTellsColor[1] }} className='timeTells'>{players[1].timeTells}</div>}
          </div>}
          {players[2] && players[2].isActive && <div className={`player player2-6 ${is5max ? 'max5' : ''}`}>
            <div
                className="nickname player2"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[2] && playersState[2].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[2].nickname}</span>
              <span className="balance player0">{players[2].balance} BB</span>
            </div>
            {players[2].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[2].bet ? <div className={'amount ' + players[2].agroClass}>{players[2].bet} BB</div> : null}
            {isPlayersImg && playersState[2] && playersState[2].img && playersState[2].handsCount ?
                <div className={'handsCount'}>{playersState[2].handsCount}</div> : null}
            {(isShafRelevant && (players[2].enumPosition in shkafHands)) && <div className="not-hero-hand">
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[2].enumPosition].hole1Suit)]}`}>
                <div className="value">{shkafHands[players[2].enumPosition].hole1Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[2].enumPosition].hole1Suit)]}</div>
              </div>
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[2].enumPosition].hole2Suit)]}`}>
                <div className="value">{shkafHands[players[2].enumPosition].hole2Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[2].enumPosition].hole2Suit)]}</div>
              </div>
            </div>}

            {players[2].timeTells !== undefined && <div style={{ color: timeTellsColor[2] }} className='timeTells'>{players[2].timeTells}</div>}
          </div>}
          {players[3] && players[3].isActive && <div className="player player3-6">
            <div
                className="nickname player3"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[3] && playersState[3].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[3].nickname}</span>
              <span className="balance player0">{players[3].balance} BB</span>
            </div>
            {players[3].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[3].bet ? <div className={'amount ' + players[3].agroClass}>{players[3].bet} BB</div> : null}
            {isPlayersImg && playersState[3] && playersState[3].img && playersState[3].handsCount ?
                <div className={'handsCount'}>{playersState[3].handsCount}</div> : null}
            {(isShafRelevant && (players[3].enumPosition in shkafHands)) && <div className="not-hero-hand">
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[3].enumPosition].hole1Suit)]}`}>
                <div className="value">{shkafHands[players[3].enumPosition].hole1Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[3].enumPosition].hole1Suit)]}</div>
              </div>
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[3].enumPosition].hole2Suit)]}`}>
                <div className="value">{shkafHands[players[3].enumPosition].hole2Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[3].enumPosition].hole2Suit)]}</div>
              </div>
            </div>}

            {players[3].timeTells !== undefined && <div style={{ color: timeTellsColor[3] }} className='timeTells'>{players[3].timeTells}</div>}
          </div>}
          {players[4] && players[4].isActive && <div className="player player4-6">
            <div
                className="nickname player4"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[4] && playersState[4].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[4].nickname}</span>
              <span className="balance player0">{players[4].balance} BB</span>
            </div>
            {players[4].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[4].bet ? <div className={'amount ' + players[4].agroClass}>{players[4].bet} BB</div> : null}
            {isPlayersImg && playersState[4] && playersState[4].img && playersState[4].handsCount ?
                <div className={'handsCount'}>{playersState[4].handsCount}</div> : null}
          </div>}
          {players[5] && players[5].isActive && <div className="player player5-6">
            <div
                className="nickname player5"
                style={{
                  width: `${plImgWidth}px`,
                  minHeight: `${plImgHeight}px`,  // было: height
                  height: 'auto',                 // даём расти на 2 строки
                  color: (isPlayersImg && playersState[5] && playersState[5].img) ? 'transparent' : 'blue'
                }}
            >
              <span className="nickname__text">{players[5].nickname}</span>
              <span className="balance player0">{players[5].balance} BB</span>
            </div>
            {players[5].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[5].bet ? <div className={'amount ' + players[5].agroClass}>{players[5].bet} BB</div> : null}
            {isPlayersImg && playersState[5] && playersState[5].img && playersState[5].handsCount ?
                <div className={'handsCount'}>{playersState[5].handsCount}</div> : null}
            {(isShafRelevant && (players[5].enumPosition in shkafHands)) && <div className="not-hero-hand">
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[5].enumPosition].hole1Suit)]}`}>
                <div className="value">{shkafHands[players[5].enumPosition].hole1Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[5].enumPosition].hole1Suit)]}</div>
              </div>
              <div className={`cards ${enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(shkafHands[players[5].enumPosition].hole2Suit)]}`}>
                <div className="value">{shkafHands[players[5].enumPosition].hole2Value.toUpperCase()}</div>
                <div className="suit">{enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(shkafHands[players[5].enumPosition].hole2Suit)]}</div>
              </div>
            </div>}

            {players[5].timeTells !== undefined && <div style={{ color: timeTellsColor[5] }} className='timeTells'>{players[5].timeTells}</div>}
          </div>}
          <div className="board">
            <div className="pot">{pot ? `Pot: ${pot} BB` : ''}<span>{ante > 0 ? ` + ` : ''}</span><span
                className='ante'>{ante || ''}</span></div>
            <div
                className={`cards ${board[0] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}`}>
              <div className="value">{board[0] ? board[0]['value'].toUpperCase() : ''}</div>
              <div
                  className="suit">{board[0] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}</div>
            </div>
            <div
                className={`cards ${board[1] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}`}>
              <div className="value">{board[1] ? board[1]['value'].toUpperCase() : ''}</div>
              <div
                  className="suit">{board[1] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}</div>
            </div>
            <div
                className={`cards ${board[2] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}`}>
              <div className="value">{board[2] ? board[2]['value'].toUpperCase() : ''}</div>
              <div
                  className="suit">{board[2] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}</div>
            </div>
            <div
                className={`cards ${board[3] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}`}>
              <div className="value">{board[3] ? board[3]['value'].toUpperCase() : ''}</div>
              <div
                  className="suit">{board[3] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}</div>
            </div>
            <div
                className={`cards ${board[4] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}`}>
              <div className="value">{board[4] ? board[4]['value'].toUpperCase() : ''}</div>
              <div
                  className="suit">{board[4] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}</div>
            </div>
          </div>
          <div className="hero-hand">
            <div className={`cards ${heroCards ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}`}>
              <div className="value">{heroCards ? heroCards.hole1Value.toUpperCase() : ''}</div>
              <div className="suit">{heroCards ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}</div>
            </div>
            <div className={`cards ${heroCards ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}`}>
              <div className="value">{heroCards ? heroCards.hole2Value.toUpperCase() : ''}</div>
              <div className="suit">{heroCards ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}</div>
            </div>
          </div>
          {isPromptRelevant &&
              <div className="prompt">
                <table className="prompt-moves">
                  <tbody>
                  {movesList}
                  </tbody>
                </table>
              </div>
          }
          {(isButtons) &&
              <div className='hero-buttons'>
                <div className='button-fold'></div>
                <div className='button-call'></div>
                <div className='button-raise'></div>
              </div>
          }
          {debug_mode &&
              <div className='debugTable'>
                <div>{'hand: ' + debug_hand}</div>
                <div
                    className={`debug-info-str ` + (debug_aggregatorLock ? 'true' : '')}>{'aggregatorLock: ' + debug_aggregatorLock}</div>
                <div className={`debug-info-str ` + (debug_move ? 'true' : '')}>{'move: ' + debug_move}</div>
              </div>
          }
          {reportSent && <div className='reportSuccess'>
            Отчет отправлен!
          </div>}
          {showReportButtons && <div className="supportReportSpan">
            support report!
          </div>}
          {showReportButtons && <div className='reportButtons'>
            <button className='reportNepodskaz' type="button" onClick={this.supportReportHandler} value={'noPrompt'}>Неподсказ</button>
            <button className='reportTormoza' type="button" onClick={this.supportReportHandler} value={'slow'}>Тормоза</button>
            <button className='reportStratError' type="button" onClick={this.supportReportHandler} style={ { fontSize: '16px' } } value={'error'}>Ошибка стратегии</button>
            <button className='reportCancel' type="button" onClick={this.supportReportHandler} value={'cancel'}>✘</button>
          </div>}
          {showReportButtons && <AudioRecorder setAudioBlobParent={this.setAudioBlobParent}/>}

          {!!(limitPrompt || limit) && <div className="limit" >{(limitPrompt || limit)}</div>}
        </div>
    );
  }
}

export default Table;


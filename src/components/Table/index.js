// Core
import React from 'react';
import { Component } from 'react';

// Instruments
import { enumPoker } from '../../enum';
import AudioRecorder from "../audioReport";
import PlayerTypeNickname from './PlayerTypeNickname';
import { TableHud } from '../Hud';

const testImg = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAAARCAAAAAAHjfaAAAAECklEQVQ4ET3BW2jWBRzG8e/ze5WoSLSVK7sIE4KGWUlWF5WFub22d62orlPBDCp1ztyadHCz6ZYwxWlIWztZrRMUFXWRUBY0t0zLLIhOZHSgCKuLmPD/PW0IfT6aLZfSRBGWoVRAYOu6d1j8Y6LXb3r4xUQihUfKd3wsR0bKIMyW5sGNgDDCICWlAiIjZQjNtpgm2TkjZUDGmliw9hWY+eWMpT/KyEw5UK6MAQ4jR0Jcdv8z3xM202SUQpaZJkdqji1hWTIYJFvgltbh9aj2xS9vO51UFp54U3hkRWXsen238MovDs64bf5X7xPz5v3067k1/56/sBeCNIFlZJBlQnMiI4HABoEFOPKGN35aYn1Q093NFftr4IemQzFU1zDevXpiCe5fvBjve4LW5o7d9cN/nZvzZEukRIoUsoxQlQATBozIcBSSfN6xWbd+ccnRYtHv53x+3qHOhxr+uGpyuNw41rX6z8ernoxTW+Z0cNXPjza376oMFR993SbIwAiZQshhK1SFUsKIaSmRQhZP3zfSXHvg0D3UjZwoT5797hUbnh+ubTzctap3qw9ePbo+Dy5a+XZrc8eu+uET5UnAmAALCkpWCqEqZJBBWFhghOHSsV9ublrX1sfK7j0d0NzS9+hQXeNY9+rtPTxX2bqXwdvXjW7e1LG7MjhRb0HKEmdkoERIVULmfzIyZ7y3oPbA/GXHWfNU5y5z387XHhiubRzrXr2jx/0NW3s1XF730iObOvasGJqoZ4oRBgTITJFRlQSyDAKHTaSRzLY1rTt+u/Y0a9t3d4oHHxtdN7z8rsNdK7t2Rt8dT+7TUN36F9qaOvbW9080YIcSqSDALtkILM01SEbmDBkVKMzSl8eXtD0XWd93pLHQQHlL/2Bt4/iOVV099FXa9zFY3jDa0rRtb3lwvAGQZaYJgywzRRdihZGZIstMMQ4469Oqfxb9C7O/0v5nG544dd3fg8vvnNi+qquHvkr7Pg2UN4xu3rhtb3ngSD3IMiADMjLIoGpkLAsjlCATKcAtTR/fbdk37K+GU4+8xUDtXYe3r+ra5b5K+zMeqmt6adPGzt4V/RMNkXIYBwkCCyxhzVWQkaU0YYRxFKWiVAjNWnbyEwvlzHuvOfrqZPjGuR/+fvMFJz/xrVXfHGPZrG+P11z+2Xfn3/L3exBFyUphRYGwwBKqlgVYlmVZGIJERpZlAlsGWYCRZSBSsgEZgSESCFsWGFlY1QjLyBC2jDAQVgosE6REyohpShkJWyhlKQGBQUaWpURKJF2EUpZlwjJgYbmUGGQhyzKyslTIIOQoIiPDYBAWYEURCQJkYbB0sYUjgxSWSwWETSSEHRiwKZFECqUcKUdCpERGlhKRBAbZwiALDPEfC2E4nEB1DVYAAAAASUVORK5CYII=';

// const maxDiff = 55;
// const regretDiffMax = 3;
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
const isNumber = (value) => {
  return typeof +value === 'number' && !isNaN(value);
}
const moveActionName = ['P', 'B', 'R', 'C', 'X', 'F'];

function getTimeTellsColorgetColor(street, timeSec) {
  // пороги для каждой улицы (по-прежнему 3 и 10 сек)
  const thresholds = {
    0: { fast: 3, slow: 10 },
    1: { fast: 3, slow: 10 },
    2: { fast: 3, slow: 10 },
    3: { fast: 3, slow: 10 },
  };
  const { fast, slow } = thresholds[street] || thresholds[3];

  // максимально яркий канал
  const MAX = 200;
  // «оранжевый» промежуточный канал (раньше 165 → теперь 165/255*200)
  const MID = Math.round(165 * MAX / 255);

  // крайние случаи
  if (timeSec <= 0) {
    return `rgb(${MAX},0,0)`;       // чистый «красный»
  }
  if (timeSec >= slow) {
    return `rgb(0,${MAX},0)`;       // чистый «зелёный»
  }

  // 1) диапазон [0 … fast]: красный → оранжевый
  if (timeSec <= fast) {
    const t = timeSec / fast;       // от 0 до 1
    const r = MAX;                  // всегда максимальный красный
    const g = Math.round(MID * t);  // от 0 до MID
    return `rgb(${r},${g},0)`;
  }

  // 2) диапазон (fast … slow): оранжевый → зелёный
  const t2 = (timeSec - fast) / (slow - fast); // от 0 до 1
  const r = Math.round(MAX * (1 - t2));                   // от MAX до 0
  const g = Math.round(MID + (MAX - MID) * t2);           // от MID до MAX
  return `rgb(${r},${g},0)`;
};

function getColorByLimit(value) {
  value = +value;
  if (value <= 5) return 'yellow';
  if (value <= 10) return 'orange';
  if (value <= 20) return 'green';
  if (value <= 50) return 'blue';
  if (value <= 100) return 'brown';
  return 'red';
}

const barabanLimitsArr = ['5', '10', '20', '50', '100', '200'];

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
      '5': { dateNow: 0, serviceData: {} },
      '10': { dateNow: 0, serviceData: {} },
      '20': { dateNow: 0, serviceData: {} },
      '50': { dateNow: 0, serviceData: {} },
      '100': { dateNow: 0, serviceData: {} },
      '200': { dateNow: 0, serviceData: {} }
    },
    limitPro: '200',
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.isHudPreview) return;
    const { baraban: prevBaraban } = prevState;
    const { baraban: nextBaraban } = this.props;
    const { limitPro: prevLimitPro } = prevState;
    const { prompt = {} } = this.props;
    const nextLimitPro = prompt.limitPro;

    // 1) Сравниваем baraban (объекты). Лучше всего — делать поверхностное сравнение ключей:
    let barabanChanged = false;
    Object.keys(nextBaraban).forEach(limit => {
      if (barabanLimitsArr.includes(limit) && prevBaraban[limit].dateNow !== nextBaraban[limit].dateNow) {
        console.log('baraban dateNow changed');
        barabanChanged = true;
      }
    });

    if (barabanChanged) {
      this.setState({ baraban: nextBaraban });
    }

    // 2) Сравнимаем limitPro
    if (Object.keys(prompt).length && prevLimitPro !== nextLimitPro && nextLimitPro !== '-1' && Number.isInteger(+nextLimitPro)) {
      // Здесь setState вызовется только один раз при реальном изменении limitPro
      this.setState({ limitPro: nextLimitPro });
    }

    // Пример логирования (можно убрать или оставить):
    const { turnOffButtons, isHeroTurn } = this.props.handPrompt;
    // Выводим в консоль только при изменении данных:
    if (prevProps.handPrompt.turnOffButtons !== turnOffButtons ||
        prevProps.prompt.isHeroTurn !== this.props.prompt.isHeroTurn) {
      // console.log('turnOffButtons:', prevProps.handPrompt.turnOffButtons);
      // console.log('isHeroTurn:', this.props.prompt.isHeroTurn);
    }

    // 3) Если нужно синхронизировать playersState при изменении handNumber или players:
    const prevHandNumber = prevState.handNumberState;
    const { handNumber, players } = this.props.prompt || {};
    const havePlayersImgs = Array.isArray(players) && players.some(pl => pl && !!pl.img);

    if (prevHandNumber !== handNumber && handNumber && havePlayersImgs) {
      this.setState({
        handNumberState: handNumber,
        playersState: deepClone(players),
      });
    }

    if (prevState.handNumberState !== this.state.handNumberState) {
      // console.log('handNumberState только что обновился в state:', this.state.handNumberState);
      // console.log('playersState теперь такое:', this.state.playersState);
    }
  }

  // componentDidUpdate(prevProps) {
  //   ... старая версия, оставляем закомментированной ...
  // }

  setAudioBlobParent = (audioBlob) => {
    this.setState({
      audioBlob,
    });
  };

  getColor = (isAgro, isFold, checkedRotten) => {
    if (isAgro) {
      if (checkedRotten) {
        return `rgb(${200}, 0, 0)`;
      }
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

  getBgColor = (isAgro, isFold, checked, checkedRotten, checkedRottenHighMistake) => {
    // checked — текущий выбранный ход, в том числе новый prefferedSizing после замены на backend.
    if (checked) {
      if (isAgro) {
        return `rgba(245, 120, 120, 0.65)`;
      } else if (isFold) {
        return `rgba(140, 140, 140, 0.65)`;
      }
      return `rgba(170, 170, 0, 0.65)`;
    } else {
      if (checkedRotten) {
        // checkedRotten — СТАРЫЙ ход до замены: бирюзовый; при высокой ошибке — пурпурный.
        // Backend ставит checkedRottenHighMistake только при фактической замене с canMoveWithHighMistake === true.
        if (checkedRottenHighMistake === true) {
          return `rgba(210, 0, 255, 0.65)`;
        }
        return `rgba(0, 210, 255, 0.65)`;
      }
      return 'transparent';
    }
  };

  getStreetColor = street => {
    switch (street) {
      case 0:
        return `rgba(156, 156, 156, 0.8)`;
      case 1:
        return `rgba(87, 163, 54, 0.8)`;
      case 2:
        return `rgba(56, 116, 168, 0.8)`;
      default:
        return `rgba(147, 54, 163, 0.8)`;
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

  selectPlayerForMerging = (e) => {
    e.stopPropagation();
    const className = e.target.className; // nickname player5  balance player5
    if ((/nickname/i).test(className) || (/balance/i).test(className)) {
      const { prompt, mergeAdaptPlayers, handPrompt = {} } = this.props;
      const { handNumber, players = [] } = prompt;
      const chair = +className.charAt(className.length - 1);

      if (handNumber && isNumber(chair) && players[chair]) {
        const player = { handNumber, chair, handsCount: players[chair].handsCount, backgroundImage: players[chair].img };
        mergeAdaptPlayers(player);
      }
    }

    return false;
  };

  handleReportClick = (event) => {
    if (this.props.isHudPreview) return;
    if (this.state.showReportButtons) return;
    // Player interactions must never fall through to opening a report.
    if (event.target.closest('.player, .player-type-picker, .player-hud')) return;
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

  // NEW: универсальный рендер игрока для позиций >= 3
  // старые блоки player0–player2 остаются как есть
  renderDynamicPlayer = (
      idx,
      players,
      playersState,
      isPlayersImg,
      isShafRelevant,
      shkafHands,
      timeTellsColor,
      plImgWidth,
      plImgHeight,
      is5max,
      is4max,
      playersCount,
      pickerBackgroundColor
  ) => {
    const player = players[idx];
    if (!player) return null;
    if (!(player.isActive || (isShafRelevant && (player.enumPosition in shkafHands)))) {
      return null;
    }

    const state = playersState[idx] || {};
    const hasImg = isPlayersImg && state && state.img;
    const hasHandsCount = hasImg && state.handsCount;
    const hasShkaf = isShafRelevant && (player.enumPosition in shkafHands);

    const shkafHand = hasShkaf ? shkafHands[player.enumPosition] : null;
    // console.log('is4max', is4max);
    // let maxIndex = Infinity;
    // if (is5max) {
    //   playersCount = 5;
    //   maxIndex = 4
    // }
    // if (is4max) {
    //   playersCount = 4;
    // }
    // console.log('playersCount', playersCount);

    return (
        players[idx]
        && (players[idx].isActive || (isShafRelevant && (players[idx].enumPosition in shkafHands)))
        && (
          <PlayerTypeNickname
              key={idx}
              seatClassName={`player player${idx} player${idx}-${playersCount} ${is5max ? 'max5' : ''} ${is4max ? 'max4' : ''}`}
              reportMode={this.state.showReportButtons}
              pickerBackgroundColor={pickerBackgroundColor}
              className={`nickname player${idx}`}
              playerType={player.playerType}
              isHero={player.isHero}
              tableId={this.props.id}
              handNumber={this.props.prompt.handNumber}
              chair={idx}
              style={{
                backgroundImage: `url("data:image/png;base64,${hasImg ? state.img : ''}")`,
                width: `${plImgWidth}px`,
                minHeight: `${plImgHeight}px`,
                height: 'auto',
                color: hasImg ? 'transparent' : 'blue',
              }}
              seatDetails={<>
          {player.isDealer ? (
              <div className="dealer">
                <span>D</span>
              </div>
          ) : null}

          {player.bet ? (
              <div className={'amount ' + player.agroClass}>{player.bet} BB</div>
          ) : null}

          {hasHandsCount && (
              <div className="handsCount">{state.handsCount}</div>
          )}

          {hasShkaf && shkafHand && (
              <div className="not-hero-hand">
                <div
                    className={`cards ${
                        enumPoker.cardsSuitsName[
                            enumPoker.cardsSuits.indexOf(shkafHand.hole1Suit)
                            ]
                    }`}
                >
                  <div className="value">
                    {shkafHand.hole1Value.toUpperCase()}
                  </div>
                  <div className="suit">
                    {
                      enumPoker.cardsSuitsCode[
                          enumPoker.cardsSuits.indexOf(shkafHand.hole1Suit)
                          ]
                    }
                  </div>
                </div>
                <div
                    className={`cards ${
                        enumPoker.cardsSuitsName[
                            enumPoker.cardsSuits.indexOf(shkafHand.hole2Suit)
                            ]
                    }`}
                >
                  <div className="value">
                    {shkafHand.hole2Value.toUpperCase()}
                  </div>
                  <div className="suit">
                    {
                      enumPoker.cardsSuitsCode[
                          enumPoker.cardsSuits.indexOf(shkafHand.hole2Suit)
                          ]
                    }
                  </div>
                </div>
              </div>
          )}

          {player.timeTells !== undefined && (
              <div
                  style={{ color: timeTellsColor[idx] }}
                  className="timeTells"
              >
                {player.timeTells}
              </div>
          )}
              </>}
          >
            <span className="nickname__text">{player.nickname}</span>
            <span className={`balance player${idx}`}>{player.balance} BB</span>
          </PlayerTypeNickname> )
    );
  };

  render() {
    const {
      playersState = [],
      handNumberState,
      showReportButtons,
      reportSent,
      limitPro,
      baraban = {}
    } = this.props.isHudPreview ? { ...this.state, playersState: this.props.prompt.players,
      handNumberState: this.props.prompt.handNumber, limitPro: this.props.prompt.limitPro || this.state.limitPro,
      baraban: this.props.baraban, showReportButtons: false, reportSent: false } : this.state;

    const barabanLimit = baraban[limitPro] || {};

    const { serviceData = {} } = barabanLimit;

    const {
      summaryBarabansCount = 0,
      maxNicks = []  // [{ maxNick, count }, ... ]
    } = serviceData;

    const {
      shkaf = {},
      prompt = {},
      handPrompt = {},
      handEV = {},
      position,
      debug_mode,
      isButtons = false,
      playersCount = 3,
      highlightDifficultSpotsEnabled = true,
      highlightDifficultSpotsDemoActive = false,
      highlightDifficultSpotsColor = '#767676'
    } = this.props;

    const { shkafHandNumber, shkafHands = {} } = shkaf;

    const {
      is5max,
      is4max,
      plImgHeight = 20,
      plImgWidth = 111,
      players = [],
      pot = '',
      heroCards = '',
      board = [],
      isHeroTurn = false,
      move_id,
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
      hand_move_id,
      hand_handNumber,
      wasBet,
      prevHeroAmountAtCurStreet,
      maxAmount,
      turnOffButtons,
      heroMoves,
      summaryStrategy = {},
      isLowQualityAfterZeroProbabMove,
      isSuperLowQualityHeroZeroProbabMove,
      promptHash,
      limit,
      flopTurnCount,
      hasDifficultSpotHighlight
    } = handPrompt;

    const {
      strategyEV = {},
      hand_move_id_ev,
      hand_handNumber_ev,
      isHeroButtons
    } = handEV;

    const isBaraban = baraban[limitPro] && baraban[limitPro].dateNow;
    // const maxNick = isBaraban && baraban[limitPro].maxNick;
    const barabanColor = getColorByLimit(limitPro);

    const barabanStyle = {
      width: '27px',
      height: '27px',
      borderRadius: '50%',
      zIndex: 2000,
      position: 'absolute',
      backgroundColor: barabanColor,
    };

    const isPlayersImg = handNumberState === handNumber;
    // const isPromptRelevant = move_id === hand_move_id && handNumber === hand_handNumber && isButtons;
    const isPromptRelevant = promptHash !== undefined && promptHash === situationHash && handNumber === hand_handNumber && isButtons;
    const isDifficultSpotHighlightRelevant = highlightDifficultSpotsEnabled && hasDifficultSpotHighlight && isPromptRelevant;

    const isShafRelevant = handNumber === shkafHandNumber;

    const timeTellsColor = Array(players.length).fill().map((cur, i) => {
      if (players[i] && players[i].timeTells !== undefined) {
        return getTimeTellsColorgetColor(players[i].lastMoveStreet, players[i].timeTells);
      }
    });

    let movesList = [];
    let handHistory;
    const heroMovesf = heroMoves || prompt.heroMoves;
    const flopTurnCountf = flopTurnCount || prompt.flopTurnCount;
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
        const isAgro = +key > 0;
        const isFold = key === '-1';
        const isMax = Math.max(...listKeys) === +key && +key > 0;
        const invest = maxAmount - prevHeroAmountAtCurStreet;
        const moveType = this.getMoveType(isAgro, isFold, wasBet, isMax, invest);
        let ev, evShort, discountEv;
        if (move && move.discountEv) {
          ev = `${((+move.ev)/100).toFixed(2)}`;
          evShort = `${((+move.ev)/100).toFixed(2)}`;
          discountEv = ` (${((+move.discountEv)/100).toFixed(2)})`;
        } else {
          ev = `${((+move.ev)/100).toFixed(2)}`;
        }
        const probab = `${(+move.strategy * 100).toFixed(1)}%`;
        const amount = isAgro ? (((maxAmount ? (maxAmount + +key) : +key) / 100)) : '';

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
          color: (isLowQualityAfterZeroProbabMove || isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? ((isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? 'lightgrey' : 'grey') : this.getColor(isAgro, isFold, move.checkedRotten),
          fontSize: discountEv === undefined ? 27 : 26,
          backgroundColor: this.getBgColor(isAgro, isFold, move.checked, move.checkedRotten, move.checkedRottenHighMistake),
        };

        const evStyle = {
          color: (isLowQualityAfterZeroProbabMove || isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? ((isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? 'lightgrey' : 'grey') : this.getEvColor(ev, maxEv, minEv)
        };

        return <tr key={key} style={componentStyle}>
          <td>{moveType + potPercent + ' ' + (isMax ? ' ' : ` ${amount} `)}</td>
          <td className="move-ev" style={evStyle}>
            {discountEv === undefined ? (
                ev
            ) : (
                <>
                  <span style={{ color: "gray" }}>{evShort}</span>
                  <span>{discountEv}</span>
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
      backgroundColor: (highlightDifficultSpotsDemoActive || isDifficultSpotHighlightRelevant) ? highlightDifficultSpotsColor : ((isSuperLowQualityHeroZeroProbabMove || isSuperLowQualityHeroZeroProbabMovePH) ? '#e38a8a' : (isLowQualityAfterZeroProbabMove ? '#e3b8b8' : 'lightgrey')),
      boxShadow: (highlightDifficultSpotsDemoActive || isDifficultSpotHighlightRelevant) ? 'inset 0 0 0 2px rgba(45, 51, 56, 0.45)' : 'none',
      transition: 'background-color 120ms linear, box-shadow 120ms linear'
    };

    return (
        <div
            className={`main-container spins party-poker ${position}${this.props.isPingStale && !this.props.isHudPreview ? ' ping-stale' : ''}`}
            style={tableStyle}
            onDoubleClick={this.handleReportClick}
            data-table-id={this.props.id}
            onDoubleClickCapture={this.props.isHudPreview ? event => event.stopPropagation() : undefined}
        >
          {this.props.isHudPreview && <div className="hud-preview-badge">Тестовый стол 0 · HUD</div>}
          <TableHud prompt={prompt} playersCount={playersCount} />
          {(handHistory) && <ul className='hero-hand-history'>
            {handHistory}
          </ul>}
          { flopTurnCountf && <div className='flopTurnCount'>{flopTurnCountf}</div> }
          { bankChance && <div className='bankChance'>{bankChance}</div> }

          {players.map((pl, idx) =>
              idx >= 0
                  ? this.renderDynamicPlayer(
                      idx,
                      players,
                      playersState,
                      isPlayersImg,
                      isShafRelevant,
                      shkafHands,
                      timeTellsColor,
                      plImgWidth,
                      plImgHeight,
                      is5max,
                      is4max,
                      playersCount,
                      tableStyle.backgroundColor
                  )
                  : null
          )}

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
            <div
                className={`cards ${heroCards ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}`}>
              <div className="value">{heroCards ? heroCards.hole1Value.toUpperCase() : ''}</div>
              <div
                  className="suit">{heroCards ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}</div>
            </div>
            <div
                className={`cards ${heroCards ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}`}>
              <div className="value">{heroCards ? heroCards.hole2Value.toUpperCase() : ''}</div>
              <div
                  className="suit">{heroCards ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}</div>
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
          {isButtons &&
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
            <button className='reportNepodskaz' type="button" onClick={this.supportReportHandler}
                    value={'noPrompt'}>Неподсказ
            </button>
            <button className='reportTormoza' type="button" onClick={this.supportReportHandler} value={'slow'}>Тормоза
            </button>
            <button className='reportStratError' type="button" onClick={this.supportReportHandler}
                    style={{fontSize: '16px'}} value={'error'}>Ошибка стратегии
            </button>
            <button className='reportCancel' type="button" onClick={this.supportReportHandler} value={'cancel'}>✘
            </button>
          </div>}
          {showReportButtons && <AudioRecorder setAudioBlobParent={this.setAudioBlobParent}/>}

          {isBaraban && (
              <div className="barabanWrapper">
                <div className="barabanDot" style={barabanStyle} />

                <div className="barabanTopRow">
                  <div className="barabanSummary">
                    {summaryBarabansCount}
                  </div>
                </div>

                {!!maxNicks?.length && (
                    <div className="barabanList">
                      {maxNicks.map((item, i) => (
                          <div className="barabanRow" key={`${item?.maxNick} x${i}`}>
                            <div className="barabanNick">
                              {item?.maxNick || '...'}
                            </div>
                            <div className="barabanCount">
                              {item?.count ?? 0}
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          )}

          {!!(limitPrompt || limit) && <div className="limit" >{(limitPrompt || limit)}</div>}
        </div>
    );
  }
}

export default Table;

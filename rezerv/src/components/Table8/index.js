// Core
import React from 'react';
import { Component } from 'react';

// Instruments
import { enumPoker } from '../../enum';

// const maxDiff = 55;
// const regretDiffMax = 3;
const testImg = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAAARCAAAAAAHjfaAAAAECklEQVQ4ET3BW2jWBRzG8e/ze5WoSLSVK7sIE4KGWUlWF5WFub22d62orlPBDCp1ztyadHCz6ZYwxWlIWztZrRMUFXWRUBY0t0zLLIhOZHSgCKuLmPD/PW0IfT6aLZfSRBGWoVRAYOu6d1j8Y6LXb3r4xUQihUfKd3wsR0bKIMyW5sGNgDDCICWlAiIjZQjNtpgm2TkjZUDGmliw9hWY+eWMpT/KyEw5UK6MAQ4jR0Jcdv8z3xM202SUQpaZJkdqji1hWTIYJFvgltbh9aj2xS9vO51UFp54U3hkRWXsen238MovDs64bf5X7xPz5v3067k1/56/sBeCNIFlZJBlQnMiI4HABoEFOPKGN35aYn1Q093NFftr4IemQzFU1zDevXpiCe5fvBjve4LW5o7d9cN/nZvzZEukRIoUsoxQlQATBozIcBSSfN6xWbd+ccnRYtHv53x+3qHOhxr+uGpyuNw41rX6z8ernoxTW+Z0cNXPjza376oMFR993SbIwAiZQshhK1SFUsKIaSmRQhZP3zfSXHvg0D3UjZwoT5797hUbnh+ubTzctap3qw9ePbo+Dy5a+XZrc8eu+uET5UnAmAALCkpWCqEqZJBBWFhghOHSsV9ublrX1sfK7j0d0NzS9+hQXeNY9+rtPTxX2bqXwdvXjW7e1LG7MjhRb0HKEmdkoERIVULmfzIyZ7y3oPbA/GXHWfNU5y5z387XHhiubRzrXr2jx/0NW3s1XF730iObOvasGJqoZ4oRBgTITJFRlQSyDAKHTaSRzLY1rTt+u/Y0a9t3d4oHHxtdN7z8rsNdK7t2Rt8dT+7TUN36F9qaOvbW9080YIcSqSDALtkILM01SEbmDBkVKMzSl8eXtD0XWd93pLHQQHlL/2Bt4/iOVV099FXa9zFY3jDa0rRtb3lwvAGQZaYJgywzRRdihZGZIstMMQ4469Oqfxb9C7O/0v5nG544dd3fg8vvnNi+qquHvkr7Pg2UN4xu3rhtb3ngSD3IMiADMjLIoGpkLAsjlCATKcAtTR/fbdk37K+GU4+8xUDtXYe3r+ra5b5K+zMeqmt6adPGzt4V/RMNkXIYBwkCCyxhzVWQkaU0YYRxFKWiVAjNWnbyEwvlzHuvOfrqZPjGuR/+fvMFJz/xrVXfHGPZrG+P11z+2Xfn3/L3exBFyUphRYGwwBKqlgVYlmVZGIJERpZlAlsGWYCRZSBSsgEZgSESCFsWGFlY1QjLyBC2jDAQVgosE6REyohpShkJWyhlKQGBQUaWpURKJF2EUpZlwjJgYbmUGGQhyzKyslTIIOQoIiPDYBAWYEURCQJkYbB0sYUjgxSWSwWETSSEHRiwKZFECqUcKUdCpERGlhKRBAbZwiALDPEfC2E4nEB1DVYAAAAASUVORK5CYII=';

const isNumber = (value) => {
  return typeof +value === 'number' && !isNaN(value);
}
const moveActionName = ['P', 'B', 'R', 'C', 'X', 'F'];
class Table extends Component {

  // shouldComponentUpdate(nextProps, nextState) {
  //
  // }

  getColor = (isAgro, isFold) => {
    if (isAgro) {
      return `rgb(${255}, 0, 0)`;
    } else if (isFold) {
      return `rgb(${0}, ${0}, ${0})`;
    }
    return `rgb(${255}, ${255}, 0)`;
  };

  getEvColor = (ev, maxEv, minEv) => {
    console.log('ev', ev);
    console.log('maxEv', maxEv);
    console.log('minEv', minEv);
    console.log('(maxEv - minEv)', (maxEv - minEv));
    if ((maxEv - minEv) === 0) {
      return `rgb(${255}, 255, 255) !important`;
    }

    const newMin = maxEv - 0.4;
    if (ev < newMin) {
      console.log('ev', ev);
      console.log('newMin', newMin);
      return `rgb(${100}, 100, 100)`;
    }

    const minEvNew = Math.max(newMin, minEv);
    const OldRange = (maxEv - minEvNew);
    let NewRange = 1
    let NewValue = (((ev - minEvNew) * NewRange) / OldRange) + 0;

    console.log('NewValue', NewValue);
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
      console.log('className', className);
      const { prompt, mergeAdaptPlayers, handPrompt = {} } = this.props;
      const { handNumber, players = [] } = prompt;
      // const { hand_handNumber } = handPrompt;
      const chair = +className.charAt(className.length - 1);

      if (handNumber && isNumber(chair) && players[chair]) {
        const player = { handNumber, chair, handsCount: players[chair].handsCount, backgroundImage: players[chair].img };
        mergeAdaptPlayers(player);
      }
    }

    return false;
  };

  render() {
    const {
      prompt = {},
      handPrompt = {},
      handEV = {},
      position,
      debug_mode,
    } = this.props;

    const {
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
      isLowQualityAfterZeroProbabMove
    } = handPrompt;

    const {
      strategyEV = {},
      hand_move_id_ev,
      hand_handNumber_ev,
    } = handEV;

    // console.log(turnOffButtons);
    // console.log(heroCards);


    const isPromptRelevant = move_id === hand_move_id && handNumber === hand_handNumber;

    let movesList = [];
    // console.log(heroMoves);
    let handHistory;
    // console.log(heroMoves);
    const heroMovesf = heroMoves || prompt.heroMoves;
    if (heroMovesf) {
      let lastStreet = 0;
      handHistory = heroMovesf.map((move, key) => {
        console.log(move);
        const isAgro = move.action === 1 || move.action === 2;
        const isFold = false;
        const isPost = move.action === 0;
        const isLimp = move.action === 3 && move.amount === 100;

        // const componentStyle = {
        //   color: isPost ? `rgb(${255}, ${255}, 0)` : this.getColor(isAgro, isFold),
        //   fontSize: 22,
        //   backgroundColor: this.getStreetColor(move.street),
        // };

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
        if (strategy[sizing].ev/100 < minEv) {
          minEv = strategy[sizing].ev/100;
        }
        if (strategy[sizing].ev/100 > maxEv) {
          maxEv = strategy[sizing].ev/100;
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
        let ev = `${(((moveEV !== undefined && move_id === hand_move_id_ev && handNumber === hand_handNumber_ev) ? +moveEV.ev : +move.ev)/100).toFixed(2)}`;    // + 'BB'
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

        // if (moveType === 'Check') {
        //   ev = ev < 0 ? 0 : ev;
        // } else if (moveType === 'Fold') {
        //   ev = '0.00';
        // }

        const componentStyle = {
          color: this.getColor(isAgro, isFold),
          fontSize: 27,
          backgroundColor: this.getBgColor(isAgro, isFold, move.checked),
        };

        const evStyle = {
            color: this.getEvColor(ev, maxEv, minEv)
        };

        return <tr key={key} style={componentStyle}>
          <td>{moveType + potPercent + ' ' + (isMax ? ' ' : ` ${amount} `)}</td>
          <td className="move-ev" style={evStyle}>{ev}</td>
          <td className="move-ev"><span className='move-probab'>{probab}</span></td>
          <td className="move-ev">{summaryStrategyPercent}</td>
        </tr>
      });
    }

    return (
        <div className={`main-container spins party-poker ${position}`}>
          {/*{(heroMoves && heroMoves.length) && <div>{'test history'}</div>}*/}
          {(handHistory) && <ul className='hero-hand-history'>
                        {handHistory}
                     </ul>}
          {players[0] && players[0].isActive && <div className="player player0-8">
            <div className="nickname player0" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[0].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[0].img ? 'transparent' : 'blue' }}>{'player_0'} <span
                className="balance player0">{players[0].balance + ' BB'}</span></div>
            {players[0].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[0].bet ? <div className={'amount ' + players[0].agroClass}>{players[0].bet} BB</div> : null}
            {players[0].img && players[0].handsCount ? <div className={'handsCount'}>{players[0].handsCount}</div> : null}
          </div>}
          {players[1] && players[1].isActive && <div className="player player1-8">
            <div className="nickname player1" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[1].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[1].img ? 'transparent' : 'blue' }}>{'player_1'} <span
                className="balance player1">{players[1].balance + ' BB'}</span></div>
            {players[1].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[1].bet ? <div className={'amount ' + players[1].agroClass}>{players[1].bet} BB</div> : null}
            {players[1].img && players[1].handsCount ? <div className={'handsCount'}>{players[1].handsCount}</div> : null}
          </div>}
          {players[2] && players[2].isActive && <div className="player player2-8">
            <div className="nickname player2" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[2].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[2].img ? 'transparent' : 'blue' }}>{'player_2'} <span
                className="balance player2">{players[2].balance + ' BB'}</span></div>
            {players[2].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[2].bet ? <div className={'amount ' + players[2].agroClass}>{players[2].bet} BB</div> : null}
            {players[2].img && players[2].handsCount ? <div className={'handsCount'}>{players[2].handsCount}</div> : null}
          </div>}
          {players[3] && players[3].isActive && <div className="player player3-8">
            <div className="nickname player3" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[3].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[3].img ? 'transparent' : 'blue' }}>{'player_3'} <span
                className="balance player3">{players[3].balance + ' BB'}</span></div>
            {players[3].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[3].bet ? <div className={'amount ' + players[3].agroClass}>{players[3].bet} BB</div> : null}
            {players[3].img && players[3].handsCount ? <div className={'handsCount'}>{players[3].handsCount}</div> : null}
          </div>}
          {players[4] && players[4].isActive && <div className="player player4-8">
            <div className="nickname player4" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[4].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[4].img ? 'transparent' : 'blue' }}>{'player_4'} <span
                className="balance player4">{players[4].balance + ' BB'}</span></div>
            {players[4].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[4].bet ? <div className={'amount ' + players[4].agroClass}>{players[4].bet} BB</div> : null}
            {players[4].img && players[4].handsCount ? <div className={'handsCount'}>{players[4].handsCount}</div> : null}
          </div>}
          {players[5] && players[5].isActive && <div className="player player5-8">
            <div className="nickname player5" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[5].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[5].img ? 'transparent' : 'blue' }}>{'player_5'} <span
                className="balance player5">{players[5].balance + ' BB'}</span></div>
            {players[5].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[5].bet ? <div className={'amount ' + players[5].agroClass}>{players[5].bet} BB</div> : null}
            {players[5].img && players[5].handsCount ? <div className={'handsCount'}>{players[5].handsCount}</div> : null}
          </div>}
          {players[6] && players[6].isActive && <div className="player player6-8">
            <div className="nickname player6" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[6].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[6].img ? 'transparent' : 'blue' }}>{'player_6'} <span
                className="balance player6">{players[6].balance + ' BB'}</span></div>
            {players[6].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[6].bet ? <div className={'amount ' + players[6].agroClass}>{players[6].bet} BB</div> : null}
            {players[6].img && players[6].handsCount ? <div className={'handsCount'}>{players[6].handsCount}</div> : null}
          </div>}
          {players[7] && players[7].isActive && <div className="player player7-8">
            <div className="nickname player7" onClick={this.selectPlayerForMerging}  style={{backgroundImage: "url(\"data:image/png;base64," + players[7].img + "\")", width: plImgWidth + 'px', height: plImgHeight + 'px', color: players[7].img ? 'transparent' : 'blue' }}>{'player_7'} <span
                className="balance player7">{players[7].balance + ' BB'}</span></div>
            {players[7].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[7].bet ? <div className={'amount ' + players[7].agroClass}>{players[7].bet} BB</div> : null}
            {players[7].img && players[7].handsCount ? <div className={'handsCount'}>{players[7].handsCount}</div> : null}
          </div>}
          <div className="board">
            <div className="pot">{pot ? `Pot: ${pot} BB` : ''}<span>{ante > 0 ? ` + ` : ''}</span><span className='ante'>{ante || ''}</span></div>
            <div className={`cards ${board[0] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}`}>
              <div className="value">{board[0] ? board[0]['value'].toUpperCase() : ''}</div>
              <div className="suit">{board[0] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}</div>
            </div>
            <div className={`cards ${board[1] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}`}>
              <div className="value">{board[1] ? board[1]['value'].toUpperCase() : ''}</div>
              <div className="suit">{board[1] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}</div>
            </div>
            <div className={`cards ${board[2] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}`}>
              <div className="value">{board[2] ? board[2]['value'].toUpperCase() : ''}</div>
              <div className="suit">{board[2] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}</div>
            </div>
            <div className={`cards ${board[3] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}`}>
              <div className="value">{board[3] ? board[3]['value'].toUpperCase() : ''}</div>
              <div className="suit">{board[3] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}</div>
            </div>
            <div className={`cards ${board[4] ? enumPoker.cardsSuitsName[enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}`}>
              <div className="value">{board[4] ? board[4]['value'].toUpperCase() : ''}</div>
              <div className="suit">{board[4] ? enumPoker.cardsSuitsCode[enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}</div>
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
              {/*<ul className="prompt-moves">{ isPromptRelevant ? [] : movesList }</ul>*/}
              <table className="prompt-moves">
                <tbody>
                  { movesList }
                </tbody>
              </table>
            </div>
          }
          {(isHeroTurn && !turnOffButtons) &&
            <div className='hero-buttons'>
              <div className='button-fold'></div>
              <div className='button-call'></div>
              <div className='button-raise'></div>
            </div>
          }
          {debug_mode &&
            <div className='debugTable'>
              <div>{'hand: ' + debug_hand}</div>
              <div className={`debug-info-str ` + (debug_aggregatorLock ? 'true' : '')}>{'aggregatorLock: ' + debug_aggregatorLock}</div>
              <div className={`debug-info-str ` + (debug_move ? 'true' : '')}>{'move: ' + debug_move}</div>
            </div>
          }
        </div>
    );
  }
}

export default Table;


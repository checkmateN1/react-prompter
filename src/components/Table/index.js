// Core
import React, { Component } from 'react';

// Instruments
import { enumPoker } from '../../enum';

const maxDiff = 55;
const regretDiffMax = 3;

class Table extends Component {

  getColor = (isAgro, isFold) => {
    if (isAgro) {
      return `rgb(${255}, 0, 0)`;
    } else if (isFold) {
      return `rgb(${0}, ${0}, ${0})`;
    }
    return `rgb(${255}, ${255}, 0)`;
  };

  getMoveType = (isAgro, isFold, wasBet, isMaxAgro) => {
    if (isMaxAgro) { return 'All-in'; }
    if (isAgro) {
      return wasBet ? 'Raise' : 'Bet';
    } else if (isFold) {
      return 'Fold';
    }
    return wasBet ? 'Call' : 'Check';
  };

  render() {
    const {
      prompt = {},
      handPrompt = {},
      position,
      debug_mode,
    } = this.props;

    const {
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
    } = prompt;

    const {
      strategy = {},
      hand_move_id,
      hand_handNumber,
      wasBet,
      maxAmount,
    } = handPrompt;

    const isPromptRelevant = move_id === hand_move_id && handNumber === hand_handNumber;

    const maxRegret = Object.keys(strategy).reduce((max, move) => {
      return strategy[move].regret > max ? strategy[move].regret : max;
    }, 0);

    let movesList = [];
    if (isPromptRelevant) {
      const listKeys = Object.keys(strategy).sort((a, b) => +b - +a);
      const maxSizeMoves = listKeys.reduce((sum, key) => Math.abs(maxRegret - strategy[key].regret) <= regretDiffMax ? (sum + 1) : sum, 0);
        movesList = listKeys.map(key => {
        const move = strategy[key];
        const regretDiff = Math.min(Math.abs(maxRegret - move.regret), maxDiff);
        const isAgro = +key > 0;
        const isFold = key === '-1';
        const isMax = Math.max(...listKeys) == key;
        const moveType = this.getMoveType(isAgro, isFold, wasBet, isMax);
        // const probab = Math.round(move.strategy * 100);
        const regret = (move.regret/100).toFixed(2) + 'BB';
        const amount = isAgro ? (Math.round((maxAmount ? (maxAmount + +key) : +key) / 100) + 'BB') : '';

        const componentStyle = {
          color: this.getColor(isAgro, isFold),
          // fontSize: (probab > 5 || regretDiff < 3) ? 38 : (25 - regretDiff * 0.182),
          fontSize: (regretDiff < regretDiffMax) ? Math.max(38/(0.7 + maxSizeMoves * 0.3), 25) : (25 - regretDiff * 0.182),   // min 25px top size
        };

        return <tr key={key} style={componentStyle}>
          <td>{moveType + (isMax ? ' ' : ` ${amount} `)}</td>
          <td className="regret">{regret}</td>
        </tr>
      });
    }

    return (
        <div className={`main-container spins party-poker ${position}`}>
          {players[0] && <div className="player player0">
            <div className="nickname">{players[0].nickname} <span
                className="balance">{players[0].balance} BB</span></div>
            {players[0].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[0].bet ? <div className={'amount ' + players[0].agroClass}>{players[0].bet} BB</div> : null}
          </div>}
          {players[1] && <div className="player player1">
            <div className="nickname">{players[1].nickname} <span
                className="balance">{players[1].balance} BB</span></div>
            {players[1].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[1].bet ? <div className={'amount ' + players[1].agroClass}>{players[1].bet} BB</div> : null}
          </div>}
          {players[2] && <div className="player player2">
            <div className="nickname">{players[2].nickname} <span
                className="balance">{players[2].balance} BB</span></div>
            {players[2].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[2].bet ? <div className={'amount ' + players[2].agroClass}>{players[2].bet} BB</div> : null}
          </div>}
          <div className="board">
            <div className="pot">{pot ? `Pot: ${pot} BB` : ''}</div>
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
          {isHeroTurn &&
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


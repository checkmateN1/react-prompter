// Core
import React, { Component } from 'react';

// Instruments
import { enumPoker } from '../../enum';

class Table extends Component {

  render() {
    const {
      prompt = {},
      position,
    } = this.props;

    const {
      players = [],
      pot = '',
      heroCards = '',
      board = [],
    } = prompt;

    return (
        <div className={`main-container spins party-poker ${position}`}>
          {players[0] && <div className="player player0">
            <div className="nickname">{players[0].nickname} <span
                className="balance">{players[0].balance} BB</span></div>
            {players[0].isDealer ? <div className="dealer"><span>D</span></div> : null}
            {players[0].bet ? <div className={'amount ' + players[0].agroClass}>{players[0].bet} BB</div> : null}
          </div>}
          {players[1] && <div className="player player1">
            <div className="nickname red">{players[1].nickname} <span
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
          <div className="prompt">
          </div>
        </div>
    );
  }
}

export default Table;


// Core
import React, { Component } from 'react';
import io from 'socket.io-client';

// Instruments
import './style.scss';

const ioClient = io("http://localhost:27990");
const token = 'uidfksicnm730pdemg662oermfyf75jdf9djf';  // simulator/debug

// authorization
ioClient.emit('authorization', token);

ioClient.on('authorizationSuccess', () => {
  console.log('authorization success: client');
});

ioClient.on('disconnect', () => {
  console.log('server gone');
});

class FileUpload extends Component {

  state = {
    fileName: 'Upload image',
    imgSrc: '',
    folderPath: '',
    myImage: `url('/table_620.jpg')`,
    prompt: null,
  };

  fileSelectedHandler = event => {
    // check size
    const input = event.target;
    const el = document.getElementById('upload-wrapper');

    if (input.files[0] === undefined) return false;

    const _URL = window.URL || window.webkitURL;
    const img = new Image();
    img.src = _URL.createObjectURL(input.files[0]);
    console.log("input.files[0]");
    console.log(input.files[0]);
    if ((input.files[0])) {
      img.onload = () => {
        this.setState({
          fileName: input.files[0].name,
          imgSrc: img.src,
        });

        el.style.backgroundImage = `url(${img.src})`;
        console.log(input.value);
        el.style.position = 'absolute';
        el.style.width = `${img.width/2.5}px`;
        el.style.height = `${img.height/2.5}px`;
        el.style.top = '50px';
        el.style.left = '10px';
        el.style.backgroundSize = 'contain';
      };
    } else {
      this.setState({
        fileName: '',
        imgSrc: '',
        fileNameTMP: '',
      });
    }

    ioClient.on("image", info => {
      if (info.image) {
        console.log(info);
        this.setState({
          fileFromServer: info.fileToSend,
        });
        const img = new Image();
        img.src = 'data:image/jpeg;base64,' + info.buffer;
        // ctx.drawImage(img, 0, 0);

        const el = document.getElementById('upload-wrapper');
        img.onload = () => {
          // this.setState({
          //   imgSrc: img.src,
          //   fileName: this.state.fileNameTMP,
          //   fileNameTMP: '',
          // });

          el.style.backgroundImage = `url(${img.src})`;
          el.style.position = 'absolute';
          el.style.width = `${img.width / 2.5}px`;
          el.style.height = `${img.height / 2.5}px`;
          el.style.top = '50px';
          el.style.left = '10px';
          el.style.backgroundSize = 'contain';
        };
      }
    });

    ioClient.on("fileName", data => {
      console.log(data.fileToSend);
      this.setState({
        fileName: data.fileToSend,
      });
    });

    ioClient.on("prompt", data => {
      console.log(data);
      const {
        players,
        pot,
        heroCards,
        enumPoker,
        board,
      } = data.prompt;

      console.log('board[0]');
      console.log(board[0]);

      console.log('enumPoker');
      console.log(enumPoker);

      console.log('heroCards');
      console.log(heroCards);

      const shape =
          <div className="main-container spins party-poker">
            {players[0] && <div className="player player0">
              <div className="nickname green">{players[0].nickname} <span
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
              <div className="pot">Pot: {pot} BB</div>
              <div className={`cards ${board[0] ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}`}>
                <div className="value">{board[0] ? board[0]['value'].toUpperCase() : ''}</div>
                <div className="suit">{board[0] ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(board[0].suit)] : ''}</div>
              </div>
              <div className={`cards ${board[1] ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}`}>
                <div className="value">{board[1] ? board[1]['value'].toUpperCase() : ''}</div>
                <div className="suit">{board[1] ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(board[1].suit)] : ''}</div>
              </div>
              <div className={`cards ${board[2] ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}`}>
                <div className="value">{board[2] ? board[2]['value'].toUpperCase() : ''}</div>
                <div className="suit">{board[2] ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(board[2].suit)] : ''}</div>
              </div>
              <div className={`cards ${board[3] ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}`}>
                <div className="value">{board[3] ? board[3]['value'].toUpperCase() : ''}</div>
                <div className="suit">{board[3] ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(board[3].suit)] : ''}</div>
              </div>
              <div className={`cards ${board[4] ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}`}>
                <div className="value">{board[4] ? board[4]['value'].toUpperCase() : ''}</div>
                <div className="suit">{board[4] ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(board[4].suit)] : ''}</div>
              </div>
            </div>
            <div className="hero-hand">
              <div className={`cards ${heroCards ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}`}>
                <div className="value">{heroCards ? heroCards.hole1Value.toUpperCase() : ''}</div>
                <div className="suit">{heroCards ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(heroCards.hole1Suit)] : ''}</div>
              </div>
              <div className={`cards ${heroCards ? enumPoker.enumPoker.cardsSuitsName[enumPoker.enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}`}>
                <div className="value">{heroCards ? heroCards.hole2Value.toUpperCase() : ''}</div>
                <div className="suit">{heroCards ? enumPoker.enumPoker.cardsSuitsCode[enumPoker.enumPoker.cardsSuits.indexOf(heroCards.hole2Suit)] : ''}</div>
              </div>
            </div>
            <div className="prompt">
            </div>
          </div>;

      this.setState({
        prompt: shape,
      });
    });
  };

  nextHandler = (step) =>  {
    ioClient.emit('getDebugImg', { folder: this.state.folderPath, file: this.state.fileName, step});
  };

  clearHandler = () => {
    ioClient.emit('clearDebug');
    this.setState({
      fileName: 'Upload image',
    });
  };

  folderPathHandler = (event) => {
    this.setState({ folderPath: event.target.value });
  };

  render() {
    const {
      fileName,
      prompt,
    } = this.state;

    return (
        <>
          <div className='upload-wrapper'>
            <label
                id='upload-label'
                htmlFor='file-upload'
                className='custom-file-upload'
                style={this.props.isReady ? {display: 'block'} : {display: 'none'}}
            >
              {fileName}
            </label>
            <input
                type="text"
                onChange={this.folderPathHandler}
            />
            <input
                id='file-upload'
                type='file'
                onChange={this.fileSelectedHandler}
                accept='.jpg, .jpeg, .png'
            />
            <div id='upload-wrapper'></div>
            <button
              onClick={this.clearHandler}
            >{'clear'}</button>
            <button
              className={'next-button'}
              onClick={() => this.nextHandler(1)}
            >{'>'}</button>
            <button
                onClick={() => this.nextHandler(2)}
            >{'>>'}</button>
            <button
                onClick={() => this.nextHandler(3)}
            >{'>>>'}</button>
          </div>
          {prompt}
        </>
    );
  }
}

export default FileUpload;


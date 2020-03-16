// Core
import React, { Component } from 'react';
import io from 'socket.io-client';

// Components
import Table from '../Table';

// Instruments
import './style.scss';

// const url = "http://localhost:27990";
// const url = "http://212.22.223.151:27990"; // mephisto
// const url = "http://212.22.223.151:27991"; // lucifer

// const token = 'uidfksicnm730pdemg662oermfyf75jdf9djf';  // simulator/debug

class TablesWrapper extends Component {
  state = {
    table0: {},
    table1: {},
    table2: {},
    table3: {},
    hand0: {},
    hand1: {},
    hand2: {},
    hand3: {},
    token: '',
    server1: '',
    server2: '',
    isConnected: false,
  };

  componentDidMount() {
    const token = localStorage.getItem('token');
    const server1 = localStorage.getItem('server1');
    const server2 = localStorage.getItem('server2');

    console.log('server2');
    console.log(server2);

    this.setState({
      token: token || '',
      server1: server1 || '',
      server2: server2 || '',
    });
  }

  startListener = () => {
    const {
      token,
      server1,
      server2,
    } = this.state;

    const ioClient = io(server1);

    // authorization
    ioClient.emit('authorization', token);

    ioClient.on('authorizationSuccess', () => {
      console.log('authorization success: client');

      this.setState({
        isConnected: true
      });

      localStorage.setItem('token', token);
      localStorage.setItem('server1', server1);
      localStorage.setItem('server2', server2 || '');

      ioClient.emit('startPromptSending');
    });

    ioClient.on("prompt", data => {
      this.setState({
        ['table' + data.id]: data.prompt,
      });
    });

    ioClient.on("hand_prompt", data => {
      console.log(data);
      this.setState({
        ['hand' + data.id]: data.hand_prompt,
      });
    });

    ioClient.on("debugInfo", data => {
      console.log(data);
      const {
        id,
        hand,
        aggregatorLock,
        move,
        aggregatorFree,
        sessionsQueue,
        tasksSimulationsQueue,
      } = data;
      this.setState(prevState => {
        return {
          ['table' + id]: {
            ...prevState['table' + id],
            debug_hand: hand,
            debug_aggregatorLock: aggregatorLock,
            debug_move: move,
          },
          debug_info: {
            aggregatorFree,
            sessionsQueue,
            tasksSimulationsQueue,
          }
        }
      });
    });

    ioClient.on('disconnect', () => {
      console.log('server gone');

      this.setState({
        isConnected: false
      });
    });
  };

  tokenHandler = (e) => {
    this.setState({
      token: e.target.value
    })
  };

  srv1Handler = (e) => {
    this.setState({
      server1: e.target.value
    })
  };

  srv2Handler = (e) => {
    this.setState({
      server2: e.target.value
    })
  };

  connectHandler = () => {
    const {
      token,
      server1,
    } = this.state;

    if (token && server1) {
      this.startListener();
    }
  };

  render() {
    const {
      table0,
      table1,
      table2,
      table3,
      hand0,
      hand1,
      hand2,
      hand3,
      token,
      server1,
      server2,
      debug_info = {},
      debug_mode = true,
    } = this.state;

    const {
      aggregatorFree = true,
      sessionsQueue = '',
      tasksSimulationsQueue = '',
    } = debug_info;

    // const table0 = !!Object.keys(this.state["0"]).length;
    // const table1 = !!Object.keys(this.state["1"]).length;
    // const table2 = !!Object.keys(this.state["2"]).length;
    // const table3 = !!Object.keys(this.state["3"]).length;

    return (
        <>
          <Table prompt={table0} handPrompt={hand0} debug_mode={debug_mode} position='left top'/>
          <Table prompt={table1} handPrompt={hand1} debug_mode={debug_mode} position='right top'/>
          <Table prompt={table2} handPrompt={hand2} debug_mode={debug_mode} position='left bottom'/>
          <Table prompt={table3} handPrompt={hand3} debug_mode={debug_mode} position='right bottom'/>

          {debug_mode &&
            <div className="debug-info">
              <div className={`debug-info-str ` + (aggregatorFree ? '' : 'true')}>{'aggregatorFree:' + aggregatorFree}</div>
              <div className={`debug-info-str ` + (sessionsQueue ? 'true' : '')}>{'sessionsQueue:' + sessionsQueue}</div>
              <div className={`debug-info-str ` + (tasksSimulationsQueue ? 'true' : '')}>{'tasksSimulationsQueue:' + tasksSimulationsQueue}</div>
            </div>
          }

          <div className="connection-settings">
            <input placeholder="token" type="text" defaultValue={token || ''} onChange={this.tokenHandler}/>
            <input placeholder="main server" type="text" defaultValue={server1 || ''} onChange={this.srv1Handler}/>
            <input placeholder="reserve server" type="text" defaultValue={server2 || ''} onChange={this.srv2Handler}/>

            <div className="status-wrapper">
              <button onClick={this.connectHandler}>connect</button>
              <div>{this.state.isConnected ? 'online' : 'offline'}</div>
              <div className={this.state.isConnected ? 'on' : 'off'}></div>
            </div>
          </div>
        </>
    );
  }
}

export default TablesWrapper;
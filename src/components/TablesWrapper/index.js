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
    0: {},
    1: {},
    2: {},
    3: {},
    token: '',
    server1: '',
    server2: '',
    isConnected: false,
  };

  componentDidMount() {
    const token = localStorage.getItem('token');
    const server1 = localStorage.getItem('server1');
    const server2 = localStorage.getItem('server2');
    this.setState({
      token,
      server1,
      server2
    });

    setTimeout(() => {
      this.startListener();
    }, 100)
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
      localStorage.setItem('server2', server2);

      ioClient.emit('startPromptSending');
    });

    ioClient.on("prompt", data => {
      console.log(data);

      this.setState({
        [data.id]: data.prompt,
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
      server2,
    } = this.state;

    if (token && server1) {
      this.startListener();
    }
  };

  render() {
    const table0 = !!Object.keys(this.state["0"]).length;
    const table1 = !!Object.keys(this.state["1"]).length;
    const table2 = !!Object.keys(this.state["2"]).length;
    const table3 = !!Object.keys(this.state["3"]).length;

    const token = localStorage.getItem('token');
    const server1 = localStorage.getItem('server1');
    const server2 = localStorage.getItem('server2');

    return (
        <>
          {true && <Table prompt={this.state["0"]} position='left top'/>}
          {true && <Table prompt={this.state["1"]} position='right top'/>}
          {true && <Table prompt={this.state["2"]} position='left bottom'/>}
          {true && <Table prompt={this.state["3"]} position='right bottom'/>}

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


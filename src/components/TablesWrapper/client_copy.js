import React, { Component } from 'react';
// import io from 'socket.io-client';

const { io } = require('socket.io-client/dist/socket.io.js');
// console.log('typeof io =', typeof io); // должно быть 'function'


class Wrapper extends Component {
  state = {
    token: '',
    server1: '',
    ioClient: null,
    isConnected: false,
  };

  componentDidMount() {
    const token = localStorage.getItem('token');
    const server1 = localStorage.getItem('server1');


    this.setState({
      token: token || 'test_token',
      server1: server1 || 'localhost:27900',
    });
  }

  startListener = () => {
    const {
      token,
      server1,
    } = this.state;

    const ioClient = io(server1, {
      timeout: 60000,
      pingTimeout: 60000,
      cors:{
        origin:'*',
        credentials:true
      }
    });

    // authorization
    ioClient.emit('authorization', { token, isPrompter: true });

    ioClient.on('authorizationSuccess', () => {
      console.log('authorization success: client');

      this.setState({
        isConnected: true,
        ioClient,
      });

      localStorage.setItem('token', token);
      localStorage.setItem('server1', server1);
    });

    // багато подібних слухачів, які щось мають робити
    ioClient.on("sysupdate", data => {

    });

    ioClient.on('disconnect', () => {
      console.log('server gone');
      ioClient.disconnect();
      this.setState({
        isConnected: false
      });
    });
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

  disconnectHandler = () => {
    const {
      ioClient,
    } = this.state;

    this.setState({
      ioClient: null,
      isConnected: false,
    });

    document.getElementById('connection-settings').classList.remove('on');

    if (ioClient) {
      ioClient.removeAllListeners();
      ioClient.disconnect();
    }
  };

  render() {
    const {
      isConnected
    } = this.state;

    return (
        <>
          <button onClick={this.connectHandler}></button>
          <div>{isConnected ? 'on' : 'off'}</div>
        </>
    );
  }
}

export default Wrapper;
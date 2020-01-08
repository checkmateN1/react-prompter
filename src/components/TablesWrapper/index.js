// Core
import React, { Component } from 'react';
import io from 'socket.io-client';

// Components
import Table from '../Table';

// Instruments
import './style.scss';

const ioClient = io("http://localhost:27990");
const token = 'uidfksicnm730pdemg662oermfyf75jdf9djf';  // simulator/debug

// authorization
ioClient.emit('authorization', token);

ioClient.on('authorizationSuccess', () => {
  console.log('authorization success: client');

  ioClient.emit('startPromptSending');
});

ioClient.on('disconnect', () => {
  console.log('server gone');
});

class TablesWrapper extends Component {
  state = {
    0: {},
    1: {},
    2: {},
    3: {},
  };

  componentDidMount() {
    this.startListener();
  }

  startListener = () => {
    ioClient.on("prompt", data => {
      console.log(data);

      this.setState({
        [data.id]: data.prompt,
      });
    });
  };

  render() {
    const table0 = !!Object.keys(this.state["0"]).length;
    const table1 = !!Object.keys(this.state["1"]).length;
    const table2 = !!Object.keys(this.state["2"]).length;
    const table3 = !!Object.keys(this.state["3"]).length;

    return (
        <>
          {table0 && <Table prompt={this.state["0"]} id={0}/>}
          {table1 && <Table prompt={this.state["1"]} id={1}/>}
          {table2 && <Table prompt={this.state["2"]} id={2}/>}
          {table3 && <Table prompt={this.state["3"]} id={3}/>}
        </>
    );
  }
}

export default TablesWrapper;


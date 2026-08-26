import React, { useState, useRef } from 'react';
import './AudioRecorder.css';

function AudioRecorder({ setAudioBlobParent }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleStartRecording = async () => {
        setIsRecording(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioBlob(audioBlob);
            setAudioUrl(audioUrl);
            setAudioBlobParent(audioBlob);
        };

        mediaRecorderRef.current.start();
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        mediaRecorderRef.current.stop();
    };

    const handleDeleteRecording = () => {
        setAudioUrl(null);
        setAudioBlob(null);
        setAudioBlobParent(null);
    };

    const handleSendAudio = () => {
        if (audioBlob) {
            // Отправка аудио на сервер
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.wav');
            // Используйте fetch или другой метод для отправки formData на сервер
            console.log('Аудио отправлено!');
        }
    };

    return (
        <div className='audio-recorder-wrapper'>
            {isRecording && (
                <>
                    <p className="recording-indicator">recording</p>
                    <button className="record-button stop" onClick={handleStopRecording}>останоивть запись</button>
                    <i className="fas fa-stop"></i> Stop Recording
                </>
            )}
            {/*{!isRecording && !audioUrl && (*/}
            {/*    <>*/}
            {/*        <button className="record-button start" onClick={handleStartRecording}>аудио сообщение</button>*/}
            {/*        <i className="fas fa-microphone"></i> Start Recording*/}
            {/*    </>*/}
            {/*)}*/}


            {/*{isRecording ? (*/}
            {/*    <>*/}
            {/*        <button onClick={handleStopRecording}>Stop Recording</button>*/}
            {/*        <p className="recording-indicator">recording</p>*/}
            {/*    </>*/}
            {/*) : (*/}
            {/*    <button onClick={handleStartRecording}>Start Recording</button>*/}
            {/*)}*/}

            {audioUrl && (
                <div>
                    <audio controls src={audioUrl}></audio>
                    <button className='delete-button' onClick={handleDeleteRecording}>✘</button>
                    {/*<button onClick={handleSendAudio}>Send</button>*/}
                </div>
            )}
        </div>
    );
}

export default AudioRecorder;

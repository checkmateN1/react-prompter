import React, { Component } from 'react';

class SupportForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            formVisible: false,
            description: '',
            screenshots: []
        };

        this.toggleForm = this.toggleForm.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.handleFileChange = this.handleFileChange.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleRemoveScreenshot = this.handleRemoveScreenshot.bind(this);
        this.fileInputRef = React.createRef();
    }

    toggleForm() {
        this.setState({ formVisible: !this.state.formVisible });
    }

    handleDescriptionChange(event) {
        this.setState({ description: event.target.value });
    }

    handleFileChange(event) {
        const files = Array.from(event.target.files);
        this.setState({ screenshots: [...this.state.screenshots, ...files] });
    }

    handleDrop(event) {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        this.setState({ screenshots: [...this.state.screenshots, ...files] });
    }

    handleSubmit(event) {
        event.preventDefault();
        const reportData = {
            description: this.state.description,
            screenshots: this.state.screenshots
        };
        console.log(JSON.stringify(reportData));
        // Здесь будет сетевой запрос
    }

    handleCancel() {
        this.setState({
            formVisible: false,
            description: '',
            screenshots: []
        });
    }

    handleRemoveScreenshot(index) {
        this.setState({
            screenshots: this.state.screenshots.filter((_, i) => i !== index)
        });
    }

    truncateFilename(filename) {
        const maxLength = 30;
        if (filename.length <= maxLength) return filename;
        const ext = filename.split('.').pop();
        return `${filename.substring(0, maxLength - ext.length - 3)}...${ext}`;
    }

    render() {
        const buttonStyle = {
            position: 'fixed',
            bottom: 0,
            left: 0,
            textAlign: 'center',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            cursor: 'pointer',
            zIndex: 1000
        };

        const formContainerStyle = {
            position: 'fixed',
            bottom: '60px',
            left: this.state.formVisible ? '20px' : '-350px',
            width: '300px',
            transition: 'left 0.5s ease',
            border: '1px solid #ccc',
            padding: '20px',
            backgroundColor: '#fff',
            boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
        };

        const dropZoneStyle = {
            border: '2px dashed #ccc',
            padding: '20px',
            marginTop: '10px',
            textAlign: 'center',
            backgroundColor: '#f9f9f9'
        };

        const screenshotListStyle = {
            listStyleType: 'none',
            padding: 0,
            marginTop: '10px'
        };

        const screenshotItemStyle = {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            fontSize: '7px',
            color: '#000'
        };

        const thumbnailStyle = {
            width: '50px',
            height: '50px',
            objectFit: 'cover',
            marginRight: '10px',
            borderRadius: '3px'
        };

        const removeButtonStyle = {
            color: 'red',
            cursor: 'pointer',
            marginLeft: '10px',
            fontSize: '12px',
            border: 'none',
            background: 'none'
        };

        const submitButtonStyle = {
            backgroundColor: '#282c34',
            color: '#fff',
            border: 'none',
            padding: '10px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '10px'
        };

        const cancelButtonStyle = {
            backgroundColor: '#862929',
            color: '#fff',
            border: 'none',
            padding: '10px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '10px'
        };

        return (
            <div>
                <button onClick={this.toggleForm} style={buttonStyle}>
                    Support
                </button>
                <div style={formContainerStyle}>
                    <form onSubmit={this.handleSubmit}>
            <textarea
                placeholder="Опишите вашу проблему"
                value={this.state.description}
                onChange={this.handleDescriptionChange}
                style={{ width: '100%', height: '100px', padding: '0', borderRadius: '3px', border: '1px solid #ccc', marginBottom: '10px' }}
            />
                        <input
                            type="file"
                            multiple
                            ref={this.fileInputRef}
                            onChange={this.handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <div
                            style={dropZoneStyle}
                            onDrop={this.handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            Перетащите скриншоты сюда или
                            <button type="button" onClick={() => this.fileInputRef.current.click()} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
                                Загрузите файлы
                            </button>
                        </div>
                        <ul style={screenshotListStyle}>
                            {this.state.screenshots.map((file, index) => (
                                <li key={index} style={screenshotItemStyle}>
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="screenshot"
                                        style={thumbnailStyle}
                                    />
                                    <span>{this.truncateFilename(file.name)}</span>
                                    <button
                                        type="button"
                                        onClick={() => this.handleRemoveScreenshot(index)}
                                        style={removeButtonStyle}
                                    >
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <button type="submit" style={submitButtonStyle}>Отправить отчет</button>
                        <button type="button" onClick={this.handleCancel} style={cancelButtonStyle}>Отмена</button>
                    </form>
                </div>
            </div>
        );
    }
}

export default SupportForm;

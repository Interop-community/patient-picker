import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import App from './App';

import './index.css';

ReactDOM.render(
    <React.StrictMode>
        <Router>
            <Switch>
                <Route path='/resolve/:context/against/:iss/for/:clientName/then/:endpoint' component={App}/>
                <Route path='/' component={App}/>
            </Switch>
        </Router>
    </React.StrictMode>,
    document.getElementById('root')
);

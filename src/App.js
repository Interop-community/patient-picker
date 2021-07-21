import React, {Component} from 'react';
import Cookies from 'universal-cookie';
import PersonaPicker from "./PersonaPicker";
import PatientPicker from "./PatientPicker";
import {withTheme} from "@material-ui/styles";
import {CircularProgress} from '@material-ui/core';
import logo from "./Meld Logo.FINAL-14.png";
import settings from './config/xsettings.js';
import './App.css';

const cookies = new Cookies();

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            username: '',
            password: '',
            personaPicked: false,
            personas: [],
            settings: settings[process.env.NODE_ENV || 'prod']
        };
    }

    componentDidMount() {
        let cookie = cookies.get(this.state.settings.localCookieName);
        let params = this.getQueryParams(this.props.location) || cookie;
        let iss = params ? decodeURIComponent(decodeURIComponent(params.against)) : '';
        if (params && params.state) {
            window.FHIR.oauth2.ready(params, (newSmart) => {
                sessionStorage.setItem(this.state.settings.sessionStorageName, true);
                window.smart = newSmart;
                this.getPersonas(decodeURIComponent(cookie.against));
            });
        } else if (iss) {
            cookies.remove(this.state.settings.sessionCookieName);
            cookies.remove(this.state.settings.personaCookieName);
            this.setCookie(this.state.settings.localCookieName, JSON.stringify(params));
            if (!window.location.origin) {
                window.location.origin = window.location.protocol + "//"
                    + window.location.hostname
                    + (window.location.port ? ':' + window.location.port : '');
            }

            let thisUri = window.location.origin + window.location.pathname;
            let thisUrl = thisUri.replace(/\/+$/, "/");

            let client = {
                "client_id": "patient_picker",
                "redirect_uri": thisUrl,
                "scope": "smart/orchestrate_launch user/*.* profile openid"
            };

            window.FHIR.oauth2.authorize({
                client: client,
                server: iss,
                from: '/'
            }, function (a) {
                console.log(a);
            });
        } else {
            this.getPersonas(decodeURIComponent(cookie.against));
        }
    }

    render() {
        return <div className="App">
            <header className="App-header" style={{backgroundColor: "#10759D", height: "50px", overflow: 'hidden'}}>
                <img src={logo} className="App-logo" alt="logo"/>
                <span style={{color: 'white', display: 'inline-block', lineHeight: '50px', fontSize: '2rem'}}>Context Picker</span>
            </header>
            <div className='App-content'>
                {this.state.message || this.state.personas.length
                    ? !this.state.personaPicked
                        ? <PersonaPicker personas={this.state.personas} message={this.state.message} login={this.login}/>
                        : <PatientPicker launch={this.launch}/>
                    : <CircularProgress/>}
            </div>
        </div>;
    }

    launch = (p) => {
        let cookie = cookies.get(this.state.settings.localCookieName);
        let then = decodeURIComponent(decodeURIComponent(cookie.then));
        let params = then.split('?')[1].split('&');
        let client_id = params.find(i => i.indexOf('client_id') === 0);
        client_id = client_id.split('=')[1];
        fetch(`${window.smart.server.serviceUrl}/_services/smart/Launch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                client_id,
                parameters: {patient: p.id}
            })
        })
            .then(a => a.json())
            .then(context => {
                let to = decodeURIComponent(then);
                to = to.replace(/scope=/, "launch=" + context.launch_id + "&scope=");
                window.location.replace(to);
            })
    };

    login = (persona) => {
        fetch(`${this.state.settings.authServerUrl}/userPersona/authenticate`, {
            method: 'POST',
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${window.smart.tokenResponse.access_token}`
            },
            body: JSON.stringify({username: persona.personaUserId, password: persona.password})
        })
            .then(e => e.json())
            .then(data => {
                if (data.message) {
                    this.setState({message: data.message})
                } else if (persona.resource === "Practitioner") {
                    this.setCookie(this.state.settings.personaCookieName, data.jwt, persona);
                } else {
                    this.setCookie(this.state.settings.personaCookieName, data.jwt);
                    this.launch({id: persona.fhirId})
                }
            })
    };

    setCookie = (cName, data, persona) => {
        cookies.set(cName, data, {
            domain: this.state.settings.cookieDomain,
            path: '/',
            expires: new Date((new Date()).getTime() + 300 * 60000)
        });
        if (persona) {
            this.setState({personaPicked: true});
        }
    };

    getQueryParams = (url) => {
        if (url.search) {
            let urlParams;
            let match;
            let pl = /\+/g;  // Regex for replacing addition symbol with a space
            let search = /([^&=]+)=?([^&]*)/g;
            let decode = function (s) {
                return decodeURIComponent(s.replace(pl, " "));
            };
            let query = url.search.substring(1);

            urlParams = {};
            match = search.exec(query);
            while (match) {
                urlParams[decode(match[1])] = decode(match[2]);
                match = search.exec(query);
            }
            if (urlParams.path) {
                let split = urlParams.path.split('/');
                if (split.length === 9) {
                    let params = {};
                    params[split[1]] = split[2];
                    params[split[3]] = split[4];
                    params[split[5]] = split[6];
                    params[split[7]] = split[8];
                    return params;
                }
            }
            return urlParams;
        }
    };

    getPersonas = (iss) => {
        iss = decodeURIComponent(iss);
        let sandboxId = iss.split('/')[3];
        fetch(`${this.state.settings.authServerUrl}/userPersona?sandboxId=${sandboxId}`, {
            headers: {
                Authorization: `Bearer ${window.smart.tokenResponse.access_token}`,
                Accept: "application/json",
                "Content-Type": "application/json"
            }, method: 'GET'
        })
            .then(res => res.json())
            .then(personas => this.setState({personas}))
            .catch(e => {
                e.json
                    ? e.json().then(e2 => console.log(e2))
                    : console.log(e);
            });
    };
}

export default withTheme(App);

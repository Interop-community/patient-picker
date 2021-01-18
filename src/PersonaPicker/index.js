import React, {Component} from 'react';
import {Card} from "@material-ui/core";
import {ReactComponent as Patient} from "../patient.svg";
import {ReactComponent as Practitioner} from "../fa-user-md.svg";

class PersonaPicker extends Component {
    render() {
        return <div>
            <div>
                <h4 style={{fontSize: '20px'}}>Please select a persona to launch the application</h4>
                <span>{this.props.message}</span>
                {this.props.personas.map(p => {
                    return <Card key={p.id} className='persona-card' onClick={() => this.props.login(p)}>
                        {p.resource === 'Patient' ? <Patient className='patient icon'/> : <Practitioner className='practitioner icon'/>}
                        <div>{p.personaName}</div>
                    </Card>
                })}
            </div>
        </div>;
    }
}

export default PersonaPicker;

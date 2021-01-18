import React, {Component} from 'react';
import {CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Badge, Tooltip, TextField} from "@material-ui/core";
import moment from "moment";

class PatientPicker extends Component {
    timer = null;

    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            filter: '',
            results: {
                entry: []
            }
        };
    }

    componentDidMount() {
        window.smart.api.search({type: 'Patient'})
            .done(a => {
                this.setState({results: a.data, loading: false});
            })
    }

    render() {
        return <div className='patient-picker-wrapper'>
            <div>Please select a patient</div>
            <TextField className='filter' fullWidth label='Filter by name' onChange={this.filter} value={this.state.filter}/>
            <div className='persona-table-wrapper'>
                {this.state.loading
                    ? <CircularProgress style={{marginTop: '40px'}}/>
                    : !this.state.results.entry
                        ? <div style={{paddingTop: '40%'}}>
                            No patients match the search criteria
                        </div>
                        : <Table className='persona-table'>
                        <TableHead className='persona-table-header'>
                            <TableRow>
                                <TableCell> </TableCell>
                                <TableCell className='name' style={{fontWeight: 'bold', fontSize: '14px'}}>
                                    Name
                                </TableCell>
                                <TableCell style={{fontWeight: 'bold', fontSize: '14px'}}>
                                    Identifier
                                </TableCell>
                                <TableCell style={{fontWeight: 'bold', fontSize: '14px', paddingLeft: '30px'}}>
                                    Age
                                </TableCell>
                                <TableCell style={{fontWeight: 'bold', fontSize: '14px', paddingLeft: '34px'}}>
                                    DOB
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.results.entry.map((p, i) => {
                                let res = p.resource;
                                return <TableRow key={i} onClick={() => this.props.launch(res)}>
                                    <TableCell className='persona-info left-icon-wrapper'>
                                        <Badge style={{padding: 0}}>
                                            {res.gender === 'male' ? <i className="fa fa-mars"/> : <i className="fa fa-venus"/>}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={res.fhirName || (!!res.name ? this.getName(res.name[0] || res.name) : '')}>
                                    <span>
                                    {res.fhirName || (!!res.name ? this.getName(res.name[0] || res.name) : '')}
                                    </span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className='persona-info resource'>
                                        {res.id}
                                    </TableCell>
                                    <TableCell className='persona-info resource'>
                                        {res.birthDate ? this.getAge(res.birthDate) : 'N/A'}
                                    </TableCell>
                                    <TableCell className='persona-info resource'>
                                        {res.birthDate ? moment(res.birthDate).format('DD MMM YYYY') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            })}
                        </TableBody>
                    </Table>}
            </div>
        </div>;
    }

    filter = a => {
        this.setState({filter: a.target.value});
        this.timer && clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.setState({loading: true})
            window.smart.api.search({type: 'Patient', query: {name: a.target.value}})
                .done(a => {
                    this.setState({results: a.data, loading: false});
                })
            this.timer = null;
        }, 500);
    }

    getName = (name) => {
        let strName = (name.family || name.family[0]) + ',';
        let i;
        if (name.given && name.given.length) {
            for (i = 0; i < name.given.length; i++) {
                strName += ' ' + name.given[i];
            }
        }
        return strName;
    };

    getAge = birthday => {
        if (birthday) {
            let currentDate = moment();
            let birthDate = moment(Date.parse(birthday));

            let result = "";
            let years = currentDate.diff(birthDate, 'years');
            result += years + 'y ';
            currentDate.subtract({years});
            let months = currentDate.diff(birthDate, 'months');
            result += months + 'm ';
            currentDate.subtract({months});
            let days = currentDate.diff(birthDate, 'days');
            result += days + 'd';
            return result;
        } else {
            return 'N/A'
        }
    }
}

export default PatientPicker;

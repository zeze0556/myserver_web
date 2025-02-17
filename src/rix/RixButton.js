import React,{Component, Fragment} from 'react';
import ReactDOM from 'react-dom';

export default class RixButton extends Component
{
    constructor(props) {
        super(props);
    }
    render()
    {
        let {onClick,...rest}=this.props;
        let onMyClick = (e)=> {
            onClick(e, this.props);
        };
        return <div {...rest} onClick={onMyClick}>{this.props.children}</div>;
    }
}

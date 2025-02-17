import React,{Component, Fragment} from 'react';
import ReactDOM from 'react-dom';

export default class RixTemplate extends Component
{
    constructor(props) {
        super(props);
    }

    rend_one(c, i) {
        //console.log("RixTemplate rend_one===", c);
        let {children, ...rest} = this.props;
        return <Fragment key={i}> {React.createElement(c.type, {...c.props, ...rest})} </Fragment>;
        //return <Fragment key={i}>{c}</Fragment>;
    }
    render()
    {
        //console.log("RixTemplate props===", this.props);
        if(!this.props.children) return <></>;
        //return <>{this.props.children}</>;
        if(!this.props.children.length) return this.rend_one(this.props.children, 0);
        return <>{this.props.children.map((c, i)=> {
            return this.rend_one(c,i);
            //console.log("RixTemplate rend_one===", c);
            //return <Fragment key={i}>{c}</Fragment>;
        })}</>;
    }
}

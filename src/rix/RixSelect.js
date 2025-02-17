import React,{Component, Fragment, useState, useEffect, useRef} from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
const {Metro, $} = window;

class RixSelect2 extends Component
{
    constructor(props) {
        super(props);
        this.state = {
            drop_menu: false,
            value: this.props.value
        };
        this.myselect = React.createRef();
    }
    drop_menu_toggle(e)
    {
        e.preventDefault();
        this.setState({drop_menu: !this.state.drop_menu});
    }

    onChange(e)
    {
        e.preventDefault();
        this.props.onChange(this.state.value);
    }
    rend_option_list()
    {
        let lists = [];
        let onClick=(e,v)=> {
            console.log("Rix.select=== change value===", v);
            e.preventDefault();
            this.setState({value: v});
            this.props.onChange(v);
            //const event = new Event('change', {bubbles: true});
            //this.myselect.current.dispatchEvent(event);
            //this.onChange(e, v);
        };
        this.props.options.forEach((v,index)=>{
            if(v.value === this.state.value) {
                lists.push(<li data-text={v.title} data-value={v.value} key={index} className="active" onClick={e=>onClick(e, v.value)}>
                              <a>{v.title}</a>
                           </li>);
            } else {
                lists.push(<li data-text={v.title} data-value={v.value} key={index} onClick={e=>onClick(e, v.value)}>
                             <a>{v.title}</a>
                           </li>);
            }
        });
        return (<ul className="option-list" style={{"maxHeight": "200px"}}>
                  {lists}
                </ul>);
    }
    render()
    {
        let cur_index = this.props.options.findIndex(v=>v.value === this.state.value);
        let cur = "";
        if(cur_index >= 0) {
            cur = this.props.options[cur_index].title;
        }
        return (<label className="select input-normal" onClick={e=>this.drop_menu_toggle(e)}>
                  {!this.state.drop_menu?
                   <span className="dropdown-toggle" ></span>
                   : <span className="dropdown-toggle active-toggle" ></span>}
                  <select value={this.state.value} ref={this.myselect} onChange={e=>this.onChange(e)}>
                    { this.props.options.map((v,index)=>{
                        return (<option value={v.value} key={v.value}>{v.title}</option>);
                    })}
                  </select>
                <div className="button-group d-none"></div>
                <input type="checkbox" className="select-focus-trigger"/>
                  <div className="select-input">{cur}</div>
                {this.state.drop_menu &&
              <div className="drop-container" data-role-dropdown="true">
                  <div>
                        <div className="input">
                            <input type="text" placeholder="Search..." data-role-input="true" className=""/>
                            <div className="button-group">
                                <button className="button input-clear-button" tabIndex="-1" type="button">
                                    <span className="default-icon-cross">
                                    </span>
                                </button>
                            </div>
                        </div>
                  </div>
                {this.rend_option_list()}
              </div>
                }
                  <div className="prepend">{this.props.label}</div>
                </label>);
    }
}

export default function RixSelect(props) {
    let ref = useRef(null);
    let onChange = (e)=>{
        var select = Metro.getPlugin(ref.current, 'select');
        if(!select) return;
        console.log("select==", select);
        if(props.onChange) {
            props.onChange(e,select.val());
        }
    };
    
    return (<select ref={ref} data-role="select" multiple={props.multiple} defaultValue={props.value}
            onChange={onChange}
            >{
        props.children
    }</select>);
    /*
    return (<select data-role="select" multiple onChange={onChange}>
        <optgroup label="Physical servers">
        <option value="dedicated_corei3_hp">Core i3 (hp)</option>
        <option value="dedicated_pentium_hp">Pentium (hp)</option>
        <option value="dedicated_smart_corei3_hp">Smart Core i3 (hp)</option>
        </optgroup>
        <optgroup label="Virtual hosting">
        <option value="mini">Mini</option>
        <option value="site">Site</option>
        <option value="portal">Portal</option>
        </optgroup>
        <optgroup label="Virtual servers">
        <option value="evps0">eVPS-TEST (30 дней)</option>
        <option value="evps1">eVPS-1</option>
        <option value="evps2">eVPS-2</option>
        </optgroup>
        </select>);
        */
}

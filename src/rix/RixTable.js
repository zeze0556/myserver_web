import React,{Component, Fragment} from 'react';
import ReactDOM from 'react-dom';
import RixSelect from "./RixSelect";

function RixRendOneChildren(t, index2, slot, scope) {
    //console.log("t====", t, scope);
    let result = null;
    if(!scope) {
        return (<Fragment key={index2}>{React.createElement(
            t.type,
            t.props,
        )}</Fragment>);
    }
    if(!scope.startsWith('{')) {
        result = slot;
        let newprops = {...t.props};
        newprops[scope] = slot;
        return (<Fragment key={index2}>{React.createElement(
            t.type,
            newprops,
        )}</Fragment>);
    } else {
        let looseJsonParse = (obj)=>{
            return Function('"use strict";return (' + obj + ')')()(slot);
        };
        let s = `function(${scope}=slot){return ${scope};}`;
        //console.log("eval_str===",s);
        result = looseJsonParse(s);
        //console.log(result);
        return (<Fragment key={index2}>{React.createElement(
            t.type,
            {...t.props, ...result},
        )}</Fragment>);
    }
};



export default class RixTable extends Component
{

    constructor(props) {
        super(props);
        this.state = {
            search: props?.search??false,
            page_rows:10,
            filter_value:"",
            updated:0,
            rows_block: props?.rows_block??false,
            currentPage:1,
            table_info: props?.table_info??false,
            pagination: props?.pagination??false,
            row_options:[{title:"ALL",
                          value:-1},
                         {title:"10",
                          value:10},
                        ],
        };
        this.mydata =  [];//this.myfilter();
        /*
        this.table_header = [];
        for(let i =0, j = this.props.children.length; i<j;i++) {
            let c = this.props.children[i];
            if(c.props.children && c.props.children.length>0) {
                let index = c.props.children.findIndex(v=>v.props['slot'] === 'header');
                if(index>=0) {
                    let t2 = RixRendOneChildren(c.props.children[index], index, null, null);
                    c.props.children.splice(index, 1);
                    c.props.label = t2;
                    this.table_header.push(c);
                }
            } else {
                this.table_header.push(c);
            }
            //this.table_header =  [...this.props.children];
        }
        */
        //console.log("rix.table this.state===", this.state);
    }

    myfilter() {
        let data = [];
        if(this.state.filter) {
            data = this.props.data.filter(v=> {
            return this.state.filter(v);
            });
        } else {
            if(this.props.data&&this.props.data.filter) {
            data = this.props.data.filter(v=> {
            for(let i in v) {
                    if((""+v[i]).indexOf(this.state.filter_value) != -1)
                        return true;
                }
                return false;
            });
            } else {
                data = this.props.data;
            }
        }
        this.mydata = data;
        return data;
    }
    page_rows_change(e){
        //console.log("RixTable.page_rows_change e=", e);
        e.preventDefault();
    }
    table_search()
    {
        let onChange = (e)=> {
            e.preventDefault();
            //console.log("filter onchange==",e, this.state);
            this.setState({filter_value:e.target.value});
            //this.showdata = this.myfilter();
            //this.setState({updated:this.state.updated+1});
        };
        return (
            <div className="table-search-block">
              <div className="input">
                <input type="text" data-role-input="true" data-role="input" className="" value={this.state.filter_value} onChange={onChange}/>
                <div className="button-group">
                  <button className="button input-clear-button" tabIndex="-1" type="button">
                    <span className="default-icon-cross">
                    </span>
                  </button>
                </div>
                <div className="prepend">Search:</div>
              </div>
            </div>
        );
    }
    click_row_select(e)
    {
        e.preventDefault();
        //console.log("Rix.Table click_row_select", e);
        this.setState({drop_menu: !this.state.drop_menu});
    }

    table_rows_block()
    {
        let onChange=(v) => {
            this.setState({page_rows:v,
                           updated: this.state.updated+1
                          });
        };
        return (
            <div className="table-rows-block">
              <RixSelect label="Show entries" options={this.state.row_options} value={this.state.page_rows} onChange={onChange}/>
        </div>
        );
    }

    table_rend_item(item, index, columnes, expand_func)
    {
        let ret = [];
        columnes.forEach((c,index)=> {
            if(c.props.type=="expand") {
                let toggle=(e)=> {
                    e.preventDefault();
                    if(item.expand === undefined) item.expand = false;
                    item.expand = !item.expand;
                    //console.log("toggle======", item);
                    this.setState({updated: this.state.updated+1});
                };
                ret.push(<td key={index} onClick={toggle}><span className="mif-chevron-right"/></td>);
                if(item.expand) {
                    if(c.props.children && !c.props.children.length)
                    {
                        let items = [];
                        items.push(<td colSpan={this.props.children.length} key={0}>{RixRendOneChildren(c.props.children, 0, {row:item}, c.props.children.props['slot-scope'])}</td>);
                        expand_func(items);
                        return;
                    }
                    if(c.props.children.length>0) {
                        let items = [];
                        c.props.children.forEach((t, index2)=>{
                            items.push(<td key={index2} colSpan={this.props.children.length}>{RixRendOneChildren(t, index2, {row:item}, t.props['slot-scope'])}</td>);
                        });
                        expand_func(items);
                    }
                }
                return;
            }
            if(c.props.prop) {
                ret.push(<td key={index}>{item[c.props.prop]}</td>);
            } else {
                if(c.props.children.length>0) {
                    let items = [];
                    c.props.children.forEach((t, index2)=>{
                        if(t.props['slot'] === 'header') {
                            //console.log("c======", c, "t=", t);
                            //let t2 = RixRendOneChildren(t, index2, null, null);
                            //console.log("t2==", t2);
                            //c.props.label = t2;
                        } else {
                            items.push(RixRendOneChildren(t, index2, {row:item}, t.props['slot-scope']));
                        }
                    });
                    ret.push(<td key={index}>{items}</td>);

                } else if(c.props.children){
                    //console.log("a====", c);
                    let t = c.props.children;
                    if(t.props['slot'] === 'header') {
                        ret.push(<td key={index}></td>);
                    } else {
                        ret.push(<td key={index}>{RixRendOneChildren(t, 0, {row:item},t.props['slot-scope'])}</td>);
                    }
                }
            }
        });
        return ret;
    }
    rend_one_head(item, index)
    {
        if (item.props.children&&item.props.children.length>0) {
            let index = item.props.children.findIndex(v=>v.props['slot'] === 'header');
            if(index>=0) {
                let t2 = RixRendOneChildren(item.props.children[index], index, null, null);
                return <th>{t2}</th>;
            }
        }
        return <>{item}</>;
    }
    table_thead()
    {
        let columnes = this.props.children;
        return <tr>{columnes}</tr>;
    }
    table_tbody()
    {
        let columnes = this.props.children;
        let data = this.myfilter();
        if(this.state.page_rows != -1) {
            data = data.slice((this.state.currentPage-1)*this.state.page_rows, this.state.currentPage * this.state.page_rows);
        }
        let ret=[];
        if(data.length > 0) {
            return <>{data.map((item, index)=> {
                //console.log("rix.table rend one=", item);
                let ex = [];
                let cadd = this.table_rend_item(item, index, columnes, (ap)=>{ex=ap;});
                let className = this.props.rowclassname?this.props.rowclassname({row:item}):null;
                if(ex.length >0) {
                    //console.log("rix.table ex=====", ex);
                    return <Fragment key={index}>
                               <tr style={className}>{cadd}</tr>
                               <tr>{ex}</tr>
                           </Fragment>;
                } else {
                    return <Fragment key={index}>
                               <tr style={className}>{cadd}</tr>
                           </Fragment>;
            }
            })}
                   </>;
        } else {
            return (<tr><td colSpan="8" className="text-center">Nothing to show</td></tr>);
        }
    }
    table_container()
    {
        return (<div className="table-container" style={{"overflow":"visible"}}>
              <table className="table table-border striped" data-rows-steps="-1,10" data-rows="10" data-cell-wrapper="false" data-horizontal-scroll="true" data-horizontal-scroll-stop="lg" data-role-table="true">
                <thead>
                  <tr>
                {this.props.children}
                </tr>
                </thead>
                <tbody>
                  {this.table_tbody()}
                </tbody>
                <tfoot>
                </tfoot>
                </table>
            </div>
        );
    }
    table_bottom()
    {
        let cur_start = (this.state.currentPage-1)*this.state.page_rows;
        let cur_end = (this.state.currentPage)*this.state.page_rows;
        let allcount = this.mydata.length;
        let prev_disabled = "";
        let next_disabled = "";
        let onNext=(e)=> {
            e.preventDefault();
            if((this.state.currentPage)*this.state.page_rows < this.mydata.length) {
                this.setState({currentPage:this.state.currentPage+1});
            }
        };
        let onPrev=(e)=> {
            e.preventDefault();
            if(this.state.currentPage>1) {
                this.setState({currentPage:this.state.currentPage-1});
            }
        };
        if(this.state.currentPage === 1) {
            prev_disabled = "disabled";
        }
        if(cur_end < allcount) {
            next_disabled = "disabled";
        }
        //console.log("RixTable.js table_botom allccount===", allcount, JSON.stringify(this.mydata));
        return (<div className="table-bottom">
                {this.state.table_info&&<div className="table-info">Showing {cur_start} to {cur_end} of {allcount} entries</div>
                }
                {this.state.pagination&&
                  <div className="table-pagination">
                    <ul className="pagination">
                      <li className="page-item service prev-page {prev_disabled}">
                        <a className="page-link" onClick={onPrev}>Prev</a>
                      </li>
                      <li className="page-item active">
                        <a className="page-link">{this.state.currentPage}</a>
                      </li>
                      <li className="page-item service next-page {next_disabled}">
                        <a className="page-link" onClick={onNext}>Next</a>
                      </li>
                    </ul>
                  </div>
                }
                {this.state.pagination &&
                  <div className="table-skip" style={{"display": "none"}}>
                    <input type="text" className="input table-skip-input"/>
                      <button className="button table-skip-button">Goto page</button>
                </div>
                }
                </div>);
    }
    render()
    {
        //
        return (<div className="table-component">
                  <div className="table-top">
                    {this.state.search&&this.table_search()}
                    {this.state.rows_block&& this.table_rows_block()}
                  </div>
                  {this.table_container()}
                  {this.table_bottom()}
                </div>);
    }
}

RixTable.TableColumn = class extends Component
{
    constructor(props) {
        super(props);
        this.content = this.props.label;
    }
    setContent(c) {
        this.content = c;
    }
    render() {
        if(this.props.type==="expand")
            return <th data-format="string" data-name="" className="expand-column"></th>;

        if(this.props.children&&this.props.children.length>0) {
            //console.log("head children=", this.props.children);
            let index = this.props.children.findIndex(v=>v.props['slot'] === 'header');
            if(index>=0) {
                let t2 = RixRendOneChildren(this.props.children[index], index, null, null);
                return <th data-format="string" data-name="" className="sortable-column sort-desc">{t2}</th>;
                //return <th data-format="string" data-name="" classname="sortable-column sort-desc">{this.props.children[index]}</th>;
            }
        }
            return <th data-format="string" data-name={this.props.prop} className="sortable-column sort-desc">{this.props.label}</th>;
    }
}

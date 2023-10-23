import { BrowserRouter as Router, Route, Switch, useContext } from 'react-router-dom';
import Navigation from './components/Navigation';
import TabPanel from './components/TabPanel';
import {DataContext} from "./store/global_data.js";

function App() {
    return (
            <Router>
            <div className="App">
            <Navigation />
            <TabPanel />
            </div>
            </Router>
    );
}

export default App;

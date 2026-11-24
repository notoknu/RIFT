import React from 'react';
export default class PanelBoundary extends React.Component{
 state={failed:false};static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error){console.error('RIFT panel failed:',error.message)}
 render(){return this.state.failed?<section className="empty" role="alert"><h2>This panel could not be displayed.</h2><p>Your wallet has not been asked to sign anything by this error screen. Refresh the panel or return to discovery.</p><button className="secondary" onClick={()=>this.setState({failed:false})}>Retry panel</button><a className="secondary" href="/discover">Back to discover</a></section>:this.props.children}
}

import React from 'react'
import CustomBasicPage from '@components/CustomBasicPage';
import HeaderLogged from '@components/Commons/HeaderLogged';

export default class BuyPage extends CustomBasicPage{
    constructor(props: any) {
        super(props);

        this.state = {
            ...this.state,
            componentName: "Buy | TI-Shop",
        }
    }

    render() {

        let languageSelected = this.state.languageSelected

        return (
            <div>
                {super.render()}
                <HeaderLogged username={this.props.username}
                        email={this.props.email}
                        pathname={this.props.pathname}
                        avatar={this.props.avatar} 
                        setLanguageSelected={this.setLanguageSelected} 
                        initialLanguageSelected={languageSelected} />
                <div className="pageCentered">
                    
                </div>
            </div>
        )
    }
}
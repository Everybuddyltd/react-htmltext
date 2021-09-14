/**
 * Simple HTML to Text component
 * https://github.com/GaborWnuk
 * @flow
 */

import React, { PureComponent } from 'react';
import { addons, View, Text, StyleSheet, Platform, Image, Dimensions } from 'react-native';
import entities from 'entities';
import htmlparser from 'htmlparser2';

const baseFontStyle = {
  fontSize: 14,
  color: "green"
};
const paragraphStyle = { ...baseFontStyle,  };
const boldStyle = { ...baseFontStyle, fontWeight: '500' };
const centerStyle = { ...baseFontStyle, textAlign: 'center' };
const italicStyle = { ...baseFontStyle, fontStyle: 'italic' };
const codeStyle = { ...baseFontStyle, fontFamily: 'Menlo' };
const hrefStyle = { ...baseFontStyle, fontWeight: '500', color: '#007AFF' };
const liStyle = { ...baseFontStyle };

export default class HTMLText extends PureComponent {
  _mounted: boolean;

  _rendering: boolean;

  static defaultProps = {
    styles: StyleSheet.create({
      p: paragraphStyle,
      center: centerStyle,
      b: boldStyle,
      strong: boldStyle,
      i: italicStyle,
      em: italicStyle,
      pre: codeStyle,
      code: codeStyle,
      a: hrefStyle,
      li: liStyle,
    }),
  };

  constructor() {
    super();

    this.state = {
      element: null,
      dom: null,
    };

    this._mounted = false;
    this._rendering = false;
  }

  componentWillReceiveProps() {
    if (this.state.element) {
      return;
    }

    this.renderHTML();
  }

  componentDidMount() {
    this._mounted = true;

    this.renderHTML();
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  _onLayout = layout => {
    this.setState({ width: layout.nativeEvent.layout.width });
  };

  _htmlToComponent(done) {
    const handler = new htmlparser.DomHandler((error, dom) => {
      if (error) {
        done(error);
      }

      done(null, dom);
    });

    const parser = new htmlparser.Parser(handler);
    parser.write(this.props.html);
    parser.done();
  }

  _domToElement(dom, parent) {
    if (!dom) {
      return null;
    }

    return dom.map((node, index, list) => {
      if (node.type == 'text') {
        if (node.data === "\n") {
          return (
            <Text
              key={index}
              style={{height: 20}}
              {...this.props.textProps}
            >
              {entities.decodeHTML(node.data)}
            </Text>
          );
        }
        return (
          <Text
            key={index}
            style={parent ? this.props.styles[parent.name] : null}
            {...this.props.textProps}
          >
            {entities.decodeHTML(node.data)}
          </Text>
        );
      }

      if (node.type == 'tag') {
        let callback = null;

        if (node.name == 'a' && node.attribs && node.attribs.href) {
          callback = () => {
            const url = entities.decodeHTML(node.attribs.href);

            if (this.props.onPress !== undefined) {
              this.props.onPress(url);
            } else {
              console.warn(
                `onPress callback is undefined. Touch on ${url} won't have any effect.`,
              );
            }
          };
        }

        if (node.name == 'img') {
          const { src, width, height } = node.attribs;
          const valWidth = parseInt(width ?? "300")
          const valHeight = parseInt(height ?? "150") 
          return (
            <Image
            resizeMethod={"resize"}
            style={{width: valWidth, height: valHeight, backgroundColor: "red", margin: 10 }}
            source={{ uri: src }} />
          );
        }

        if (node.name === 'li') {
          return (
            <Text
              key={index}
              style={this.props.styles.li}
              {...this.props.textProps}
            >
              {'\n'}
              {'•'} {this._domToElement(node.children, node)}
              {index === list.length - 1 && '\n'}
            </Text>
          );
        }
        const Component = node.name === 'p' ? View : Text
        return (
          <Component
            key={index}
            onPress={callback}
            style={
              node.name == 'p' &&
              index < list.length - 1 &&
              node.children.length > 0
                ? this.props.styles.p
                : null
            }
            {...this.props.textProps}
          >
            {this._domToElement(node.children, node)}
          </Component>
        );
      }
    });
  }

  renderHTML() {
    if (!this.props.html || this._rendering) {
      return;
    }

    this._rendering = true;

    this._htmlToComponent((error: any, dom) => {
      this._rendering = false;

      if (error) {
        return console.error(error);
      }

      if (this._mounted) {
        this.setState({ dom });
      }
    });
  }

  render() {
    if (this.state.dom) {
      const { style } = this.props;
      return <>{this._domToElement(this.state.dom)}</>;
    }

    return <Text />;
  }
}

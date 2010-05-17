package com.choiceofgames.choicescript;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;


public class XmlHelper {

	public static Document xmlFromResource(String name) throws SAXException, IOException {
		String xmlString = "<vignette>\n" + 
				"  <p>Hello!</p>\n" + 
				"  <choice>\n" + 
				"    <option text='Red'>\n" + 
				"      <p>Red!</p>\n" + 
				"      <finish />\n" + 
				"    </option>\n" + 
				"    <option text='Blue'>\n" + 
				"      <p>Blue!</p>\n" + 
				"      <finish />\n" + 
				"    </option>\n" + 
				"  </choice>\n" + 
				"</vignette>";
		DocumentBuilder builder;
		try {
			builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
		} catch (ParserConfigurationException e) {
			throw new RuntimeException("Bug!", e);
		}
		ByteArrayInputStream bais = new ByteArrayInputStream(xmlString.getBytes());
		InputSource is = new InputSource(bais);
		Document document = builder.parse(is);
		return document;
	}
	
	public static String getResumePoint(Element e) {
		Element root = e.getOwnerDocument().getDocumentElement();
		String tagName = e.getTagName();
		NodeList tags = root.getElementsByTagName(tagName);
		for (int i = 0; i < tags.getLength(); i++) {
			if (e.isSameNode(tags.item(i))) {
				return "//" + tagName + "[" + (i+1) + "]";
			}
		}
		throw new RuntimeException("Bug! Couldn't find element in the document");
	}
	
	public static List<Element> getChildElementsByName(Element parent, String name) {
		List<Element> childElements = new ArrayList<Element>();
		for (Node childNode : i(parent.getChildNodes())) {
			if (childNode.getNodeType() == Node.ELEMENT_NODE) {
				Element childElement = (Element) childNode;
				if (name == null || name.equals(childElement.getTagName())) {
					childElements.add((Element) childNode);
				}
			}
		}
		return childElements;
	}
	
	public static List<Element> getChildElements(Element parent) {
		return getChildElementsByName(parent, null);
	}
	
	public static NodeListIterable i(NodeList list) {
		return new NodeListIterable(list);
	}
	
	private static class NodeListIterable implements Iterable<Node> {
		final NodeList list;
		NodeListIterable(NodeList list) {
			this.list = list;
		}
		@Override
		public Iterator<Node> iterator() {
			return new NodeListIterator(list);
		}
	}
	

	
	private static class NodeListIterator implements Iterator<Node> {
		final NodeList list;
		int index = 0;
		
		NodeListIterator(NodeList list) {
			this.list = list;
		}
		
		@Override
		public boolean hasNext() {
			return index < list.getLength();
		}

		@Override
		public Node next() {
			return list.item(index++);
		}

		@Override
		public void remove() {
			throw new UnsupportedOperationException();		
		}
		
	}

}

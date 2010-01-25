<?php

require_once('Serializer.php');

class XmlSerializer extends Serializer
{
  protected $header = array('<?xml version="1.0" encoding="UTF-8"?>', '<javascript>');
  protected $footer = array('</javascript>');

  protected function lineStarts($line) {
    if (preg_match('%^\t<object [^>]*location="([^"]+)"%', $line, $match)) {
      return $match[1];
    }
  }

  protected function lineEnds($line) {
    if (preg_match('%^\t</object>$%', $line, $match)) {
      return true;
    }
  }

  protected function linesToRaw($lines) {
    return DOMDocument::loadXML(implode("\n", $lines));
  }

  public function toObject($raw, $id=null) {
    // Might use this later
    return array();
  }

  public function toString($raw, $id=null) {
    if (!$id) {
      if (!($id = $raw->firstChild->getAttribute('location'))) {
        throw new Exception('toString must be passed an ID or raw object must contain and ID');
      }
    }

    $lines = explode("\n", str_replace('<?xml version="1.0" encoding="UTF-8"?>' . "\n", '', $raw->saveXML()));
    foreach ($lines as $i => $line) {
      $indent = 0;
      while (substr($line, 0, 2) == '  ') {
        ++$indent;
        $line = substr($line, 2);
      }
      $lines[$i] = str_repeat("\t", $indent) . $line;
    }
    return implode("\n", $lines);
  }

  protected function descend($document, $node, $object) {
    foreach ($object as $key => $value) {
      if (is_bool($value)) {
        $value = $value ? 'true' : 'false';
      }
      switch ($key{0}) {
      case '@':
        $node->setAttribute(substr($key, 1), $value);
        break;
      case '#':
        foreach ($value as $child) {
          $this->descend($document, $node->appendChild($document->createElement(substr($key, 1))), $child);
        }
        break;
      default:
        if ($key === 'content') {
          $node->appendChild($document->createTextNode($value));
        }
      }
    }
  }

  public function convertToRaw($object) {
    $document = new DOMDocument('1.0', 'UTF-8');
    $document->preserveWhiteSpace = true;
    $document->formatOutput = true;

    $this->descend($document, $document->appendChild($document->createElement('object')), $object);

    return $document;
  }
}

?>
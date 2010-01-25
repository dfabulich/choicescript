<?php

require_once('JavaScriptStatements.php');
require_once('JavaScriptVariable.php');
require_once('JavaScriptLiteral.php');
require_once('JavaScriptString.php');
require_once('JavaScriptNumber.php');
require_once('JavaScriptRegExp.php');
require_once('JavaScriptFunction.php');
require_once('JavaScriptObject.php');

class JavaScriptArray {
  protected $args;
  protected $resolved_args;
  public $length;

  public function __construct($args) {
    $this->length = count($args);
    $this->args = $args;
  }

  public function type() {
    return 'Array';
  }

  public function get($position) {
    $args = $this->all();
    return $args[$position];
  }

  private function getType($position, $type) {
    $args = $this->all();
    if ($args[$position] instanceof $type) {
      return $args[$position];
    }
  }

  public function getVariable($position) {
    if ($variable = $this->getType($position, JavaScriptVariable)) {
      return $variable->value();
    }
    if ($variable = $this->getType($position, JavaScriptLiteral)) {
      return $variable->value();
    }
  }

  public function getString($position) {
    if ($string = $this->getType($position, JavaScriptString)) {
      return $string->value();
    }
  }

  public function getNumber($position) {
    if ($number = $this->getType($position, JavaScriptNumber)) {
      return $number->value();
    }
  }

  public function getRegExp($position) {
    if ($regexp = $this->getType($position, JavaScriptRegExp)) {
      return $regexp->value();
    }
  }

  public function getFunction($position) {
    return $this->getType($position, JavaScriptFunction);
  }

  public function getArray($position) {
    return $this->getType($position, JavaScriptArray);
  }

  public function getObject($position) {
    return $this->getType($position, JavaScriptObject);
  }

  public function all() {
    if (isset($this->resolved_args)) {
      return $this->resolved_args;
    }

    $args = array();
    foreach ($this->args as $arg) {
      $args[] = $arg->convert();
    }

    return ($this->resolved_args = $args);
  }
}

?>
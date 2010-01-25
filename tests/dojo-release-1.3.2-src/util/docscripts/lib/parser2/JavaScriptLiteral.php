<?php

class JavaScriptLiteral {
  protected $value;

  public function __construct($value) {
    $this->value = $value;
  }

  public function value() {
    return $this->value;
  }

  public function type() {
    if (is_null($this->value)) {
      return 'null';
    }
    elseif (is_bool($this->value)) {
      return 'bool';
    }
    elseif (strlen($this->value->id) > 1 && in_array($this->value->id{0}, array('=', '<', '>'))) {
      return 'bool';
    }
    elseif ($this->value->id == '!') {
      return 'bool';
    }
    elseif ($this->value == 'null') {
      return $this->value;
    }
    elseif (is_null($this->value)) {
      return 'undefined';
    }
    throw new Exception("Unstringed literal type: {$this->value}");
  }
}
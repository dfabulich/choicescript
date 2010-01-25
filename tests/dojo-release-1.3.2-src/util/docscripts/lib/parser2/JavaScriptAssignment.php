<?php

require_once('JavaScriptVariable.php');

class JavaScriptAssignment extends JavaScriptVariable {
  protected $value;

  protected $resolve_value;

  public function __construct($variable, $value) {
    parent::__construct($variable);
    $this->value = $value;
  }

  public function name() {
    return parent::value();
  }

  public function value() {
    if (!isset($this->resolved_value)) {
      $this->resolved_value = $this->value->convert();
    }
    return $this->resolved_value;
  }

  public function types() {
    $value = $this->value();
    if (is_array($value)) {
      return array_map(create_function('$item', 'return $item->type();'), $value);
    }
    return array($value->type());
  }

  public function type() {
    $types = array_diff($this->types(), array('variable'));
    if (count($types) == 1) {
      return array_pop($types);
    }
  }
}
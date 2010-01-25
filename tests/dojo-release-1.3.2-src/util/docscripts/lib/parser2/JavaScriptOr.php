<?php

class JavaScriptOr extends JavaScriptVariable {
  protected $ors;

  public function __construct($ors) {
    if (!is_array($ors)) {
      throw new Exception('JavaScriptOr expects to be passed an array');
    }
    $this->ors = $ors;
  }

  public function types() {
    return array_map(create_function('$item', 'return $item->type();'), $this->ors);
  }

  public function type() {
    $types = array_diff($this->types(), array('variable'));
    if (count($types) == 1) {
      return array_pop($types);
    }
  }
}
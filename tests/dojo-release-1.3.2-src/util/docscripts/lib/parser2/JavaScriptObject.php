<?php

class JavaScriptObject {
  protected $values;

  protected $keys;

  public function __construct($values) {
    $this->values = $values;
  }

  public function type() {
    return 'Object';
  }

  public function values() {
    if (isset($this->keys)) {
      return $this->keys;
    }

    $keys = array();
    foreach ($this->values as $value) {
      if (is_array($value)) {
        $value = $value[0];
      }
      $keys[$value->key][] = $value->convert();
    }

    return ($this->keys = $keys);
  }
}
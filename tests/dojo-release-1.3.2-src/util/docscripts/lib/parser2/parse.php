<?php

require_once('JavaScriptLanguage.php');
require_once('JavaScriptParser.php');
require_once('JavaScriptStatements.php');
require_once('JavaScriptFunction.php');

if (!$argv[1]) {
  die("Enter a file name\n");
}

$parser = new JavaScriptParser(JavaScriptLanguage::tokenize(file_get_contents($argv[1])));
// print_r($parser->statements());
// die();
$package = new JavaScriptStatements($parser->statements());

$output = array();

// Handle dojo.provide calls
foreach ($package->function_calls(TRUE, 'dojo.provide') as $call) {
  if ($module = $call->arguments()->getString(0)) {
    $output['#provides'] = $module;
  }
}

// Handle dojo.require calls
foreach ($package->function_calls(TRUE, 'dojo.require') as $call) {
  if ($module = $call->arguments()->getString(0)) {
    $output['#requires'][] = array('common', $module);
  }
}

foreach ($package->function_calls(TRUE, 'dojo.mixin') as $call) {
  // TODO
}

foreach ($package->function_calls(TRUE, 'dojo.extend') as $call) {
  // TODO
}

foreach ($package->function_calls(TRUE, 'dojo.declare') as $call) {
  $arguments = $call->arguments();
  $name = $arguments->getString(0);
  $output[$name]['type'] = 'Function';
  if ($superclass = $arguments->getVariable(1)) {
    // Note: Could be null
    $output[$name]['chains']['prototype'][] = $superclass;
    $output[$name]['chains']['call'][] = $superclass;
  }
  elseif ($superclasses = $arguments->getArray(1)) {
    for($i = 0; TRUE; $i++) {
      if ($superclass = $superclasses->getVariable($i)) {
        $output[$name]['chains']['prototype'][] = $superclass . ($i ? '.prototype' : '');
        $output[$name]['chains']['call'][] = $superclass;
      }
    }
  }
  if ($mixin = $arguments->getObject(2)) {
    // Remember that bad code can have multiple matching keys
    foreach ($mixin->values() as $key => $values) {
      $full_name = "$name.$key";
      foreach ($values as $value) {
        if ($value instanceof JavaScriptFunction) {
          if ($key == 'constructor') {
            // TODO
            continue;
          }
          $output[$full_name]['prototype'] = $name;
        }
      }
    }
  }
}

foreach ($package->assignments(TRUE) as $variable) {
  $name = $variable->name();

  $parts = explode('.', $name);
  array_pop($parts);
  if (count($parts)) {
    $output[$name]['attached'] = implode('.', $parts);
  }

  if ($type = $variable->type()) {
    $output[$name]['type'] = $type;
  }
  if ($type == 'Object') {
    // Detect comments!
  }
}

print_r($output);

?>
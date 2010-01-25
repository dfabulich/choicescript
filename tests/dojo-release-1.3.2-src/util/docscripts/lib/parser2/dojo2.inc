<?php

ini_set('display_errors', 1);
error_reporting(E_ALL ^ E_NOTICE);

require_once('JavaScriptLanguage.php');
require_once('JavaScriptParser.php');
require_once('JavaScriptStatements.php');
require_once('JavaScriptFunction.php');
require_once('Dojo.php');

$_dojo_properties_modules = array();

function _dojo_get_namespaces($limit=null){
  static $namespaces;
  if (!isset($namespaces)) {
    $namespaces = array();
    $files = scandir('modules');
    foreach ($files as $file) {
      if (substr($file, -7) == '.module') {
        $namespace = substr($file, 0, -7);
        if (!$limit || in_array($namespace, $limit)) {
          include_once('modules/' . $file);
          $namespaces[] = substr($file, 0, -7);
        }
      }
      elseif (substr($file, -18) == '.module.properties') {
        $namespace = substr($file, 0, -18);
        if (!$limit || in_array($namespace, $limit)) {
          global $_dojo_properties_modules;
          foreach (preg_split('%[\n\r]+%', file_get_contents('modules/' . $file)) as $line) {
            list($line, ) = preg_split('%[!#]%', $line, 2);
            if ($line = trim($line)) {
              list($key, $line) = explode('=', $line, 2);
              $key = str_replace('\\ ', ' ', trim($key));
              $line = preg_replace('%^\s+%', '', $line);
              if ($key == 'location') {
                $line = _dojo_ensure_directory($line);
              }
              $_dojo_properties_modules[$namespace][$key] = $line;
            }
          }
          $namespaces[] = substr($file, 0, -18);
        }
      }
    }
  }
  return $namespaces;
}

function dojo_get_include($node, $provide) {
  if ($node->jsdoc_project_name == $provide->title) {
    return 'Included automatically';
  }
  else {
    return 'dojo.require("%s");';
  }
}

function _dojo_ensure_directory($directory) {
  if (!is_dir($directory)) {
    die("$directory is not a directory\n");
  }
  else {
    if(substr($directory, -1) != '/'){
      $directory .= '/';
    }
  }
  return $directory;
}

function dojo_get_file_time($namespace, $file) {
  if (function_exists($namespace . '_code_location')) {
    return filectime(_dojo_ensure_directory(call_user_func($namespace . '_code_location')) . $file);
  }
  else {
    global $_dojo_properties_modules;
    return filectime($_dojo_properties_modules[$namespace]['location'] . $file);
  }
}

function _jsdoc_file_list($dir = false, $recurse = false){
  $output = array();

  if (!$recurse) {
    $old_dir = getcwd();
    if (!is_dir($dir)) {
      return array();
    }
    chdir($dir);
    $dir = '.';
  }
  $files = scandir($dir);

  foreach ($files as $file) {
    if ($file{0} == '.') continue;
    if (is_dir($dir . '/' . $file)) {
      if ($recurse) {
        $file = $dir . '/' . $file;
      }
      $output = array_merge($output, _jsdoc_file_list($file, true));
    }else{
      if (substr($file, -3) == '.js' && substr($file, -6) != '.xd.js') {
        if ($recurse) {
          $file = $dir . '/' . $file;
        }
        $output[] = $file;
      }
    }
  }

  if (!$recurse) {
    chdir($old_dir);
  }
  return $output;
}

function dojo_get_files($limit=null) {
    $namespaces = _dojo_get_namespaces($limit);
    $files = array();
    foreach ($namespaces as $namespace) {
        if (function_exists($namespace . '_code_location')) {
          $location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
        }
        else {
          global $_dojo_properties_modules;
          $location = $_dojo_properties_modules[$namespace]['location'];
        }
        if (!$location) die($namespace . '_code_location does not return useful result');
        $list = _jsdoc_file_list($location);
        foreach ($list as $i => $item) {
            // Skip internationalization/tests/demos files
            if (preg_match('%(^|/|\\\\)(nls|tests|demos)(\\\\|/)%', $item)) {
              unset($list[$i]);
              continue;
            }
            $list[$i] = array($namespace, $item);
        }
        $files = array_merge($files, array_values($list));
    }

    return $files;
}

function dojo_get_contents($namespace, $file_name) {
  if (function_exists($namespace . '_code_location')) {
    $location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
  }
  else {
    global $_dojo_properties_modules;
    $location = $_dojo_properties_modules[$namespace]['location'];
  }

  $lines = preg_replace('%/\*={3,}|={3,}\*/%', '', file_get_contents($location . '/' . $file_name));
  $parser = new JavaScriptParser(JavaScriptLanguage::tokenize($lines));
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

  foreach ($package->function_calls(TRUE, 'dojo.mixin', 'dojo.extend') as $call) {
    $arguments = $call->arguments();
    $root = $arguments->getVariable(0);
    if (!$root) {
      continue;
    }
    $mixin = $call->name() == 'dojo.mixin';
    for ($i = 1; $i < $arguments->length; $i++) {
      if ($arguments->getObject($i)) {
        foreach ($arguments->getObject($i)->values() as $key => $values) {
          $full_name = "$root.$key";
          foreach ($values as $value) {
            if ($value instanceof JavaScriptVariable) {
              $key = $mixin ? $full_name : "$root.prototype.$key";
              if ($key != $value->value()) {
                $output[$key]['alias'] = $value->value();
              }
            }
            else {
              Dojo::roll_out($value, $full_name, $output);
              $output[$full_name][$mixin ? 'attached' : 'prototype'] = $root;
            }
          }
        }
      }
      elseif ($arguments->getVariable($i)) {
        $full_name = $arguments->getVariable($i);
        $output[$root]['chains'][$mixin ? 'normal' : 'prototoype'][] = $full_name;
      }
    }
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
        else {
          break;
        }
      }
    }
    if ($mixin = $arguments->getObject(2)) {
      // Remember that bad code can have multiple matching keys
      foreach ($mixin->values() as $key => $values) {
        $full_name = "$name.$key";
        foreach ($values as $value) {
          if ($value instanceof JavaScriptFunction) {
            if (in_array($key, array('constructor', 'preamble', 'postscript'))) {
              $output[$full_name]['constructor'] = $key;
              // TODO: Handle constructor functions differently
              // These functions will have to wait until the whole file is complete
              continue;
            }
            $output[$full_name]['prototype'] = $name;
          }
          else {
            Dojo::roll_out($value, $full_name, $output);
          }
        }
      }
    }
  }

  foreach ($package->assignments(TRUE) as $variable) {
    $name = $variable->name();

    // TODO: Handle nested objects

    Dojo::roll_out($variable->value(), $name, $output);

    $parts = explode('.', $name);
    array_pop($parts);
    if (count($parts)) {
      $output[$name]['attached'] = implode('.', $parts);
    }
  }

  // TODO: Calculate private and private_parent

  return $output;
}
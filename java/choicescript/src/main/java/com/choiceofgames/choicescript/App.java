package com.choiceofgames.choicescript;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.w3c.dom.Document;


public class App {
	public static void main(String[] args) {
		Map<String, Object> startingStats = new HashMap<String, Object>();
		startingStats.put("leadership", 50);
		startingStats.put("strength", 50);
		Navigator nav = Navigator.fromSceneList(startingStats, Arrays.asList("startup", "animal", "variables", "ending", "death"));
//		startingStats.put("name", "Dragonname");
//		startingStats.put("brutality", 50);
//		startingStats.put("cunning", 50);
//		startingStats.put("disdain", 50);
//		startingStats.put("wounds", 0);
//		startingStats.put("blasphemy", 0);
//		startingStats.put("infamy", 50);
//		startingStats.put("wealth", 5000);
//		startingStats.put("clutchmate_alive", false);
//		startingStats.put("vermias_killed_axilmeus", false);
//		startingStats.put("callax_alive", true);
//		startingStats.put("callax_with", false);
//		Navigator nav = Navigator.fromSceneList(startingStats, Arrays.asList(    "startup"
//			    ,"lair"
//			    ,"queenpolitics"
//			    ,"clutchmate"
//			    ,"heroes"
//			    ,"goblinhero"
//			    ,"warrequest"
//			    ,"worship"
//			    ,"mating"
//			    ,"evilwizard"
//			    ,"hibernation"
//));
//		startingStats.put("given_name", "Henry");
//		startingStats.put("surname", "Smythe");
//		startingStats.put("sex", "male");
//		startingStats.put("sir", "sir" );
//		startingStats.put("maam", "ma'am" );
//		startingStats.put("mr", "Mr." );
//		startingStats.put("mister", "Mister");
//		startingStats.put("mr_surname", "Mr. Smythe" );
//		startingStats.put("man", "man");
//		startingStats.put("men", "men");
//		startingStats.put("woman", "woman");
//		startingStats.put("women", "women");
//		startingStats.put("gentleman", "gentleman");
//		startingStats.put("gentlemen", "gentlemen");
//		startingStats.put("lady", "lady");
//		startingStats.put("ladies", "ladies");
//		startingStats.put("he", "he");
//		startingStats.put("his", "his");
//		startingStats.put("him", "him");
//		startingStats.put("he_opp", "she");
//		startingStats.put("his_opp", "her");
//		startingStats.put("him_opp", "her" );
//		startingStats.put("miss", "Miss");
//		startingStats.put("mrs", "Mrs");
//		startingStats.put("boy", "boy");
//		startingStats.put("girl", "girl");
//		startingStats.put("lad", "lad");
//		startingStats.put("king", "king");
//		startingStats.put("kings", "kings");
//		startingStats.put("firstlieutenant", "DEFAULTFirstLieutenant");
//		startingStats.put("dame", "Dame");
//		startingStats.put("son_opp", "daughter");
//		startingStats.put("mr_opp", "Madam");
//		startingStats.put("spouse_word", "wife");
//		startingStats.put("optout", false);
//		startingStats.put("agility", 50);
//		startingStats.put("marriage", "love");
//		startingStats.put("master", "master");
//		startingStats.put("sailing", 50 );
//		startingStats.put("intelligence", 50 );
//		startingStats.put("gunnery", 50 );
//		startingStats.put("leadership", 50 );
//		startingStats.put("fighting", 50 );
//		startingStats.put("patronage", 50 );
//		startingStats.put("tact", 50 );
//		startingStats.put("likeability", 50 );
//		startingStats.put("honor", 50 );
//		startingStats.put("courage", 50 );
//		startingStats.put("bloodthirst", 50 );
//		startingStats.put("age", 19 );
//		startingStats.put("rank", 0 );
//		startingStats.put("seniority", 0 );
//		startingStats.put("seniority2", 0 );
//		startingStats.put("knighted", true );
//		startingStats.put("wealth", 50 );
//		startingStats.put("married", true );
//		startingStats.put("spouse_name", "a");
//		startingStats.put("relationshipjones", 50 );
//		startingStats.put("relationshipvilleneuve", 50 );
//		startingStats.put("wounds", 0);
//		startingStats.put("disgraced", false);
//		startingStats.put("cashiered",  false);
//		startingStats.put("annoyedpigot", false);
//		startingStats.put("override_rank", "none");
//		startingStats.put("no_name", false );
//		startingStats.put("pigot_alive", true);
//		startingStats.put("gay", false);
//		Navigator nav = Navigator.fromSceneList(startingStats, Arrays.asList(        "GunneryStartup"
//			    ,"PrizeShip"
//			    ,"Examination"
//			    ,"BadLeadership-PigotScrewup"
//			    ,"BadLeadership-PunishPigot"
//			    ,"BadLeadership-Mutiny"
//			    ,"CuttingOut"
//			    ,"VilleneuveAshore"
//			    ,"Marriage"
//			    ,"CommandMutiny"
//			    ,"ClimacticBattle"
//			    ,"WrapUp"
//
//));
		Map<String, Object> stats = new HashMap<String, Object>();
		nav.resetStats(stats);
		String startupSceneName = nav.getStartupSceneName();
		InputOutput io = new InputOutput(nav);
		Document xml = io.loadDocument(startupSceneName);
		IVignette scene = new Vignette(startupSceneName, io, nav, xml, stats);
		while (true) {
			scene.execute();
			scene = io.handleUserInput();
		}
	}
}
